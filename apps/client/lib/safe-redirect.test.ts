import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  it("accepts an internal absolute path", () => {
    expect(safeRedirectPath("/me?tab=sessions")).toBe("/me?tab=sessions");
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "%2F%2Fevil.example",
    "me",
    "",
  ])("rejects an external or malformed destination: %s", (candidate) => {
    expect(safeRedirectPath(candidate)).toBe("/me");
  });
});
