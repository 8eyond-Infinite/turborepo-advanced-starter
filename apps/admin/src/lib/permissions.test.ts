import { describe, expect, it } from "vitest";
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
} from "./permissions";

const user = {
  permissions: ["user.read", "user.update", "audit.read"],
};

describe("permission evaluators", () => {
  it("allows an omitted requirement and rejects missing identity", () => {
    expect(hasPermission(null)).toBe(true);
    expect(hasPermission(null, "user.read")).toBe(false);
  });

  it("checks one permission without partial matching", () => {
    expect(hasPermission(user, "user.read")).toBe(true);
    expect(hasPermission(user, "user")).toBe(false);
  });

  it("requires every permission for an all requirement", () => {
    expect(hasAllPermissions(user, ["user.read", "user.update"])).toBe(true);
    expect(hasAllPermissions(user, ["user.read", "user.delete"])).toBe(false);
  });

  it("requires at least one permission for an any requirement", () => {
    expect(hasAnyPermission(user, ["role.read", "audit.read"])).toBe(true);
    expect(hasAnyPermission(user, ["role.read", "role.update"])).toBe(false);
  });

  it("treats an empty all-set as satisfied and an empty any-set as denied", () => {
    expect(hasAllPermissions(null, [])).toBe(true);
    expect(hasAnyPermission(null, [])).toBe(false);
  });
});
