import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin.e2e@example.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "AdminE2EPassword123!";

const expectNoWcagViolations = async (page: Page) => {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(results.violations).toEqual([]);
};

const login = async (page: Page) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/me$/);
};

test.describe("Client accessibility contract", () => {
  test("keeps public and login pages free of automated WCAG A/AA violations", async ({
    page,
  }) => {
    await page.goto("/");
    await expectNoWcagViolations(page);

    await page.goto("/login");
    await expectNoWcagViolations(page);

    for (const path of [
      "/register",
      "/forgot-password",
      "/check-email",
      "/verify-email",
    ]) {
      await page.goto(path);
      await expectNoWcagViolations(page);
    }
  });

  test("supports the login form with a keyboard", async ({ page }) => {
    await page.goto("/login");

    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Email")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Mật khẩu", { exact: true })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "Quên mật khẩu?" }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Đăng nhập" })).toBeFocused();
  });

  test("keeps the authenticated account page accessible", async ({ page }) => {
    await login(page);
    await expectNoWcagViolations(page);

    const skipLink = page.getByRole("link", {
      name: "Chuyển đến nội dung chính",
    });
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
    await skipLink.press("Enter");
    await expect(page.locator("#account-content")).toBeFocused();
  });
});
