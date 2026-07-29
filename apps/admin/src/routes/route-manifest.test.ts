import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@repo/contracts";
import {
  adminRouteManifest,
  getAdminRoute,
  getAdminRouteLabel,
} from "./route-manifest";

describe("admin route manifest", () => {
  it("keeps path, label and permission metadata together", () => {
    expect(adminRouteManifest).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "/users",
          label: "Quản lý Users",
          permission: PERMISSIONS.USER.READ,
        }),
      ]),
    );
  });

  it("returns the breadcrumb label for a known route", () => {
    expect(getAdminRouteLabel("/audit-logs")).toBe("Nhật ký hoạt động");
    expect(getAdminRoute("/audit-logs")?.permission).toBe(
      PERMISSIONS.AUDIT.READ,
    );
  });

  it("uses an explicit fallback for an unknown route", () => {
    expect(getAdminRouteLabel("/missing")).toBe("Không tìm thấy trang");
  });
});
