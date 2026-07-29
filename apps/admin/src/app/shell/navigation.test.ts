import { describe, expect, it } from "vitest";
import { Shield } from "lucide-react";
import { buildNavigation, isNavigationPathActive } from "./navigation";

describe("admin navigation", () => {
  it("keeps permitted items that point to known frontend routes", () => {
    const navigation = buildNavigation(
      [
        {
          title: "Administration",
          url: "#",
          icon: "Shield",
          items: [
            { title: "Users", url: "/users", permission: "user:read" },
            { title: "Roles", url: "/roles", permission: "role:read" },
          ],
        },
      ],
      (permission) => permission === "user:read",
    );

    expect(navigation).toHaveLength(1);
    expect(navigation[0]?.items).toEqual([
      { title: "Users", url: "/users", permission: "user:read" },
    ]);
  });

  it("uses the route manifest permission instead of trusting menu metadata", () => {
    const navigation = buildNavigation(
      [
        {
          title: "Administration",
          url: "#",
          items: [
            {
              title: "Users",
              url: "/users",
              permission: "role:read",
            },
          ],
        },
      ],
      (permission) => permission === "user:read",
    );

    expect(navigation[0]?.items[0]?.permission).toBe("user:read");
  });

  it("drops unknown URLs and groups with no visible items", () => {
    expect(
      buildNavigation(
        [
          {
            title: "Invalid",
            url: "#",
            items: [{ title: "Unknown", url: "/unknown" }],
          },
        ],
        () => true,
      ),
    ).toEqual([]);
  });

  it("uses a safe fallback when the backend sends an unknown icon", () => {
    const [group] = buildNavigation(
      [
        {
          title: "Administration",
          url: "#",
          icon: "UnknownIcon",
          items: [{ title: "Dashboard", url: "/" }],
        },
      ],
      () => true,
    );

    expect(group?.icon).toBe(Shield);
  });

  it("matches exact routes and nested detail routes without matching prefixes", () => {
    expect(isNavigationPathActive("/users", "/users")).toBe(true);
    expect(isNavigationPathActive("/users/u1", "/users")).toBe(true);
    expect(isNavigationPathActive("/users-archive", "/users")).toBe(false);
    expect(isNavigationPathActive("/users", "/")).toBe(false);
  });
});
