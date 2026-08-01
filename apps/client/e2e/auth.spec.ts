import {
  expect,
  test,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { EncryptJWT } from "jose";

const API_URL = "http://127.0.0.1:3101";
const CLIENT_URL = "http://127.0.0.1:3006";
const SESSION_COOKIE = "client_session";
const SESSION_SECRET = "client-browser-e2e-session-secret";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin.e2e@example.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "AdminE2EPassword123!";

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const uniqueIdentity = () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    email: `client-session.${suffix}@example.com`,
    username: `client_session_${suffix}`.replaceAll("-", "_"),
    password: "ClientSessionE2EPassword123!",
  };
};

const createSession = async (
  request: APIRequestContext,
): Promise<TokenPair> => {
  const identity = uniqueIdentity();
  const registerResponse = await request.post(`${API_URL}/auth/register`, {
    data: identity,
  });
  expect(registerResponse.ok()).toBeTruthy();

  const loginResponse = await request.post(`${API_URL}/auth/login`, {
    data: {
      email: identity.email,
      password: identity.password,
    },
  });
  expect(loginResponse.ok()).toBeTruthy();
  return (await loginResponse.json()) as TokenPair;
};

const encryptBrowserSession = async (refreshToken: string): Promise<string> => {
  const key = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(SESSION_SECRET),
    ),
  );
  return new EncryptJWT({
    // Proxy treats a malformed access token as expired and refreshes it before
    // the protected page is rendered. The refresh token remains fully real.
    accessToken: "expired-access-token",
    refreshToken,
  })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .encrypt(key);
};

const installExpiredSession = async (
  context: BrowserContext,
  refreshToken: string,
): Promise<string> => {
  const value = await encryptBrowserSession(refreshToken);
  await context.addCookies([
    {
      name: SESSION_COOKIE,
      value,
      url: CLIENT_URL,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  return value;
};

const login = async (
  page: Page,
  email = ADMIN_EMAIL,
  password = ADMIN_PASSWORD,
) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
};

test.describe("Client authentication boundary", () => {
  test("registers through the BFF without exposing tokens to the browser", async ({
    page,
  }) => {
    const identity = uniqueIdentity();
    await page.goto("/register");
    await page.getByLabel("Email").fill(identity.email);
    await page.getByLabel("Tên hiển thị").fill(identity.username);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(identity.password);
    await page.getByLabel("Nhập lại mật khẩu").fill(identity.password);
    await page.getByRole("button", { name: "Tạo tài khoản" }).click();

    await expect(page).toHaveURL(/\/login\?registered=1$/);
    expect(
      (await page.context().cookies()).some(
        (cookie) => cookie.name === SESSION_COOKIE,
      ),
    ).toBe(false);
  });

  test("redirects an unauthenticated visitor to the requested protected page", async ({
    page,
  }) => {
    await page.goto("/me");

    await expect(page).toHaveURL(/\/login\?next=%2Fme$/);
    await expect(
      page.getByRole("heading", { name: "Đăng nhập" }),
    ).toBeVisible();
  });

  test("keeps invalid credentials outside the session boundary", async ({
    page,
  }) => {
    await login(page, ADMIN_EMAIL, "definitely-wrong-password");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator("form").getByRole("alert")).toContainText(
      "Email hoặc mật khẩu không đúng.",
    );
    expect(
      (await page.context().cookies()).some(
        (cookie) => cookie.name === "client_session",
      ),
    ).toBe(false);
  });

  test("owns the authenticated session in an HttpOnly cookie", async ({
    page,
  }) => {
    const browserRequests: string[] = [];
    page.on("request", (request) => browserRequests.push(request.url()));

    await login(page);

    await expect(page).toHaveURL(/\/me$/);
    await expect(
      page.getByRole("heading", { name: "Hồ sơ của tôi" }),
    ).toBeVisible();
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Điều hướng tài khoản" }),
    ).toBeVisible();
    await expect(page.getByText(ADMIN_EMAIL, { exact: true })).toBeVisible();

    const sessionCookie = (await page.context().cookies()).find(
      (cookie) => cookie.name === "client_session",
    );
    expect(sessionCookie).toMatchObject({
      httpOnly: true,
      sameSite: "Lax",
    });

    await page.reload();
    await expect(page).toHaveURL(/\/me$/);
    await expect(page.getByText(ADMIN_EMAIL, { exact: true })).toBeVisible();
    expect(browserRequests.some((url) => url.startsWith(API_URL))).toBe(false);
  });

  test("clears the session on logout and protects the profile again", async ({
    page,
  }) => {
    await login(page);
    await expect(page).toHaveURL(/\/me$/);

    await page.getByLabel("Mở menu tài khoản").click();
    await page.getByRole("button", { name: "Đăng xuất" }).click();

    await expect(page).toHaveURL(/\/$/);
    expect(
      (await page.context().cookies()).some(
        (cookie) => cookie.name === "client_session",
      ),
    ).toBe(false);

    await page.goto("/me");
    await expect(page).toHaveURL(/\/login\?next=%2Fme$/);
  });

  test("does not redirect a successful login to an external origin", async ({
    page,
  }) => {
    await page.goto("/login?next=https%3A%2F%2Fevil.example%2Fsteal");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Đăng nhập" }).click();

    await expect(page).toHaveURL(/\/me$/);
    expect(new URL(page.url()).origin).toBe(CLIENT_URL);
  });

  test("keeps the protected account shell usable on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);

    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.locator("#account-content")).toBeVisible();
    await page.getByLabel("Mở menu tài khoản").click();
    await expect(
      page.getByRole("link", { name: "Hồ sơ", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Đăng xuất" })).toBeVisible();

    const layoutWidth = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(layoutWidth.scrollWidth).toBeLessThanOrEqual(
      layoutWidth.clientWidth,
    );
  });
});

test.describe("Client session lifecycle", () => {
  test("refreshes an expired access token before rendering a protected page", async ({
    context,
    page,
    request,
  }) => {
    const tokens = await createSession(request);
    const expiredCookie = await installExpiredSession(
      context,
      tokens.refreshToken,
    );

    await page.goto("/me");

    await expect(page).toHaveURL(/\/me$/);
    await expect(
      page.getByRole("heading", { name: "Hồ sơ của tôi" }),
    ).toBeVisible();
    const refreshedCookie = (await context.cookies()).find(
      (cookie) => cookie.name === SESSION_COOKIE,
    );
    expect(refreshedCookie?.value).toBeTruthy();
    expect(refreshedCookie?.value).not.toBe(expiredCookie);
  });

  test("deletes the BFF session when the refresh token has been revoked", async ({
    context,
    page,
    request,
  }) => {
    const tokens = await createSession(request);
    const logoutResponse = await request.post(`${API_URL}/auth/logout`, {
      headers: { Authorization: `Bearer ${tokens.refreshToken}` },
    });
    expect(logoutResponse.ok()).toBeTruthy();
    await installExpiredSession(context, tokens.refreshToken);

    await page.goto("/me");

    await expect(page).toHaveURL(/\/login\?next=%2Fme$/);
    expect(
      (await context.cookies()).some(
        (cookie) => cookie.name === SESSION_COOKIE,
      ),
    ).toBe(false);
  });

  test("shares one refresh across concurrent protected navigations", async ({
    context,
    page,
    request,
  }) => {
    const tokens = await createSession(request);
    await installExpiredSession(context, tokens.refreshToken);
    const secondPage = await context.newPage();

    await Promise.all([page.goto("/me"), secondPage.goto("/me")]);

    await expect(page).toHaveURL(/\/me$/);
    await expect(secondPage).toHaveURL(/\/me$/);
    await expect(
      page.getByRole("heading", { name: "Hồ sơ của tôi" }),
    ).toBeVisible();
    await expect(
      secondPage.getByRole("heading", { name: "Hồ sơ của tôi" }),
    ).toBeVisible();
  });
});
