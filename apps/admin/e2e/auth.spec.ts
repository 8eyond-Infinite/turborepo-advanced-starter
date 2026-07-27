import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

const API_URL = "http://127.0.0.1:3101";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin.e2e@example.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "AdminE2EPassword123!";

interface LoginResponse {
  accessToken: string;
}

interface UserResponse {
  id: string;
}

const uniqueIdentity = (prefix: string) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    email: `${prefix}.${suffix}@example.com`,
    username: `${prefix}_${suffix}`.replaceAll("-", "_"),
    password: "BrowserE2EPassword123!",
  };
};

const registerUser = async (request: APIRequestContext) => {
  const identity = uniqueIdentity("browser");
  const response = await request.post(`${API_URL}/auth/register`, {
    data: identity,
  });
  expect(response.ok()).toBeTruthy();
  return identity;
};

const loginByApi = async (
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<string> => {
  const response = await request.post(`${API_URL}/auth/login`, {
    data: { email, password },
  });
  expect(response.ok()).toBeTruthy();
  return ((await response.json()) as LoginResponse).accessToken;
};

const loginInBrowser = async (page: Page, email: string, password: string) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/$/);
};

test.describe("Admin authentication boundaries", () => {
  test("redirects an unauthenticated visitor to login", async ({ page }) => {
    await page.goto("/users");

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { name: "Administrator Login" }),
    ).toBeVisible();
  });

  test("restores an admin session from the HttpOnly refresh cookie after reload", async ({
    page,
  }) => {
    await loginInBrowser(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(
      page.getByRole("heading", { name: "Tổng quan hệ thống" }),
    ).toBeVisible();

    const refreshResponse = page.waitForResponse(
      (response) =>
        response.url() === `${API_URL}/auth/refresh` &&
        response.request().method() === "POST",
    );
    await page.reload();

    expect((await refreshResponse).ok()).toBeTruthy();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("heading", { name: "Tổng quan hệ thống" }),
    ).toBeVisible();

    const refreshCookie = (await page.context().cookies()).find(
      (cookie) => cookie.name === "refresh_token",
    );
    expect(refreshCookie).toMatchObject({
      httpOnly: true,
      sameSite: "Lax",
    });
  });

  test("renders the forbidden boundary for a USER opening an admin-only route", async ({
    page,
    request,
  }) => {
    const user = await registerUser(request);
    await loginInBrowser(page, user.email, user.password);
    await page.goto("/roles");

    await expect(
      page.getByRole("heading", { name: "Quyền truy cập bị từ chối" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/roles$/);
  });

  test("deactivating a connected user forces logout through realtime", async ({
    page,
    request,
  }) => {
    const user = await registerUser(request);
    await loginInBrowser(page, user.email, user.password);
    await expect(
      page.getByRole("heading", { name: "Tổng quan hệ thống" }),
    ).toBeVisible();

    const userToken = await loginByApi(request, user.email, user.password);
    const profileResponse = await request.get(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(profileResponse.ok()).toBeTruthy();
    const { id: userId } = (await profileResponse.json()) as UserResponse;

    const adminToken = await loginByApi(request, ADMIN_EMAIL, ADMIN_PASSWORD);
    const deactivateResponse = await request.patch(
      `${API_URL}/users/${userId}/deactivate`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      },
    );
    expect(deactivateResponse.ok()).toBeTruthy();

    await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: "Administrator Login" }),
    ).toBeVisible();
  });
});
