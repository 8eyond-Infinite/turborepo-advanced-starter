import { describe, expect, it } from "vitest";
import { adminEnvironment } from "@/config/environment";
import { resolveAvatarUrl } from "./avatar-url";

describe("resolveAvatarUrl", () => {
  it("resolves a server-relative avatar against the configured API", () => {
    expect(resolveAvatarUrl("/public/uploads/avatars/member.png")).toBe(
      new URL(
        "/public/uploads/avatars/member.png",
        `${adminEnvironment.apiUrl}/`,
      ).toString(),
    );
  });

  it("preserves absolute HTTP and HTTPS URLs", () => {
    expect(resolveAvatarUrl("https://cdn.example.com/member.png")).toBe(
      "https://cdn.example.com/member.png",
    );
    expect(resolveAvatarUrl("http://cdn.example.com/member.png")).toBe(
      "http://cdn.example.com/member.png",
    );
  });

  it.each([
    null,
    undefined,
    "",
    "avatars/member.png",
    "javascript:alert(1)",
    "data:image/png;base64,abc",
  ])("rejects an absent or unsupported avatar value: %s", (value) => {
    expect(resolveAvatarUrl(value)).toBeUndefined();
  });
});
