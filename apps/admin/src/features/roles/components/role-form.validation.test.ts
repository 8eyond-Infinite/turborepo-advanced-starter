import { describe, expect, it } from "vitest";
import { validateRoleForm } from "./role-form.validation";

describe("validateRoleForm", () => {
  it("mirrors the backend role constraints", () => {
    expect(
      validateRoleForm({ name: " ", description: "x".repeat(256) }),
    ).toEqual({
      name: "Tên vai trò phải có ít nhất 2 ký tự.",
      description: "Mô tả không được vượt quá 255 ký tự.",
    });

    expect(validateRoleForm({ name: "x".repeat(51), description: "" })).toEqual(
      {
        name: "Tên vai trò không được vượt quá 50 ký tự.",
      },
    );
  });

  it("accepts a valid custom role", () => {
    expect(
      validateRoleForm({ name: "SUPPORT", description: "Customer support" }),
    ).toEqual({});
  });
});
