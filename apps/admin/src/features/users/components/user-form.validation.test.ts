import { describe, expect, it } from "vitest";
import { validateUserForm } from "./user-form.validation";

describe("validateUserForm", () => {
  it("matches backend create-user constraints", () => {
    expect(
      validateUserForm(
        {
          email: "invalid",
          username: "ab",
          password: "12345",
          roles: [],
        },
        { requirePassword: true },
      ),
    ).toEqual({
      email: "Email không đúng định dạng.",
      username: "Username phải có từ 3 đến 50 ký tự.",
      password: "Mật khẩu phải có ít nhất 6 ký tự.",
      roles: "Vui lòng chọn ít nhất một vai trò.",
    });
  });

  it("does not require password when editing a user", () => {
    expect(
      validateUserForm(
        {
          email: "member@example.com",
          username: "member",
          roles: ["USER", "AUDITOR"],
        },
        { requirePassword: false },
      ),
    ).toEqual({});
  });
});
