import { describe, expect, it } from "vitest";
import { resolveLoginRedirect } from "./login-redirect";

describe("resolveLoginRedirect", () => {
  it("restores an internal path with its query and hash", () => {
    expect(
      resolveLoginRedirect({
        from: {
          pathname: "/users",
          search: "?page=2",
          hash: "#member",
        },
      }),
    ).toBe("/users?page=2#member");
  });

  it("falls back home when there is no previous destination", () => {
    expect(resolveLoginRedirect(undefined)).toBe("/");
  });

  it("rejects external and protocol-relative destinations", () => {
    expect(
      resolveLoginRedirect({ from: { pathname: "https://attacker.test" } }),
    ).toBe("/");
    expect(
      resolveLoginRedirect({ from: { pathname: "//attacker.test" } }),
    ).toBe("/");
  });
});
