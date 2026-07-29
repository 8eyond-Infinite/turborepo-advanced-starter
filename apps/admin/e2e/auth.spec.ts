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

  test("creates a user through the management UI", async ({ page }) => {
    const identity = uniqueIdentity("managed");
    await loginInBrowser(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/users");

    await page.getByRole("button", { name: "Thêm người dùng mới" }).click();
    await page.locator("#create-user-username").fill(identity.username);
    await page.locator("#create-user-email").fill(identity.email);
    await page.locator("#create-user-password").fill(identity.password);

    const createResponse = page.waitForResponse(
      (response) =>
        response.url() === `${API_URL}/users` &&
        response.request().method() === "POST",
    );
    await page
      .locator("form")
      .getByRole("button", { name: "Tạo người dùng" })
      .click();
    expect((await createResponse).ok()).toBeTruthy();

    await page
      .getByRole("textbox", { name: "Tìm kiếm tài khoản" })
      .fill(identity.email);
    await expect(page.getByText(identity.email, { exact: true })).toBeVisible();

    await page
      .getByRole("button", {
        name: `Chỉnh sửa tài khoản ${identity.email}`,
      })
      .click();
    const updatedUsername = `${identity.username}-edited`;
    await page.locator("#edit-user-username").fill(updatedUsername);
    const updateResponse = page.waitForResponse(
      (response) =>
        response.url().startsWith(`${API_URL}/users/`) &&
        response.request().method() === "PUT",
    );
    await page.getByRole("button", { name: "Lưu thay đổi" }).click();
    expect((await updateResponse).ok()).toBeTruthy();
    await expect(
      page.getByText(updatedUsername, { exact: true }),
    ).toBeVisible();
  });

  test("creates, grants a permission to, and deletes a custom role", async ({
    page,
  }) => {
    const roleName = `E2E_${Date.now()}`;
    await loginInBrowser(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/roles");

    await page.getByRole("button", { name: "Thêm vai trò mới" }).click();
    await page.locator("#role-name").fill(roleName);
    await page
      .locator("#role-description")
      .fill("Role managed by the browser acceptance test");

    const createResponse = page.waitForResponse(
      (response) =>
        response.url() === `${API_URL}/roles` &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Tạo vai trò" }).click();
    expect((await createResponse).ok()).toBeTruthy();
    await expect(page.getByText(roleName, { exact: true })).toBeVisible();

    const permissionCheckbox = page
      .getByRole("checkbox", {
        name: new RegExp(`Cấp quyền .+ cho vai trò ${roleName}`),
      })
      .first();
    const grantLabel = await permissionCheckbox.getAttribute("aria-label");
    expect(grantLabel).toBeTruthy();
    await permissionCheckbox.click();

    const savePermissionsButton = page.getByRole("button", {
      name: `Lưu thay đổi quyền cho vai trò ${roleName}`,
    });
    await expect(savePermissionsButton).toBeVisible();

    const updateResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/roles/") &&
        response.url().endsWith("/permissions") &&
        response.request().method() === "PUT",
    );
    await savePermissionsButton.click();
    expect((await updateResponse).ok()).toBeTruthy();
    await expect(
      page.getByRole("checkbox", {
        name: grantLabel!.replace(/^Cấp quyền/, "Thu hồi quyền"),
        exact: true,
      }),
    ).toBeChecked();

    const deleteTrigger = page.getByRole("button", {
      name: `Xóa vai trò ${roleName}`,
    });
    await deleteTrigger.hover();
    await deleteTrigger.click();
    const deleteResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/roles/") &&
        response.request().method() === "DELETE",
    );
    await page.getByRole("button", { name: "Xác nhận xóa" }).click();
    expect((await deleteResponse).ok()).toBeTruthy();
    await expect(page.getByRole("alertdialog")).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: `Xóa vai trò ${roleName}` }),
    ).not.toBeVisible();
  });

  test("revokes other sessions without ending the current browser session", async ({
    page,
    request,
  }) => {
    await loginByApi(request, ADMIN_EMAIL, ADMIN_PASSWORD);
    await loginInBrowser(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/sessions");

    await expect(page.getByText("Phiên hiện tại")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Hủy tất cả phiên khác/i }),
    ).toBeVisible();

    await page.getByRole("button", { name: /Hủy tất cả phiên khác/i }).click();
    const revokeResponse = page.waitForResponse(
      (response) =>
        response.url() === `${API_URL}/auth/sessions/revoke-others` &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Xác nhận đăng xuất toàn bộ" })
      .click();
    expect((await revokeResponse).ok()).toBeTruthy();

    await expect(page.getByRole("alertdialog")).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: /Hủy tất cả phiên khác/i }),
    ).not.toBeVisible();

    await page.reload();
    await expect(page).toHaveURL(/\/sessions$/);
    await expect(page.getByText("Phiên hiện tại")).toBeVisible();
  });

  test("searches audit records through URL-backed filters", async ({
    page,
    request,
  }) => {
    const roleName = `AUDIT_E2E_${Date.now()}`;
    const adminToken = await loginByApi(request, ADMIN_EMAIL, ADMIN_PASSWORD);
    const createRoleResponse = await request.post(`${API_URL}/roles`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        name: roleName,
        description: "Produces an auditable browser-test action",
      },
    });
    expect(createRoleResponse.ok()).toBeTruthy();

    await loginInBrowser(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(`/audit-logs?q=${roleName}`);

    await expect(
      page.getByRole("textbox", { name: "Tìm kiếm nhật ký hoạt động" }),
    ).toHaveValue(roleName);
    await expect(page.getByText("Tạo vai trò", { exact: true })).toBeVisible();
    await expect(page.getByText(new RegExp(roleName))).toBeVisible();
  });

  test("keeps the shared shell usable on a mobile viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginInBrowser(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/audit-logs");

    await expect(
      page.getByText("Nhật ký hoạt động", { exact: true }).last(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Mở danh sách thông báo" }).click();
    await expect(
      page.getByRole("heading", { name: "Thông báo" }),
    ).toBeVisible();

    const layoutWidth = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(layoutWidth.scrollWidth).toBeLessThanOrEqual(
      layoutWidth.clientWidth,
    );
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
