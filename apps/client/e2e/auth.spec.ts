import { expect, test, type Page } from "@playwright/test";

const API_URL = "http://127.0.0.1:3101";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin.e2e@example.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "AdminE2EPassword123!";

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
    await expect(page.getByRole("alert")).toContainText(
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
});
