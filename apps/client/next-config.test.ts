import { describe, expect, it } from "vitest";
import nextConfig, {
  clientSecurityHeaders,
  createContentSecurityPolicy,
} from "./next.config";

describe("Client production headers", () => {
  it("produces a minimal self-hostable runtime artifact", () => {
    expect(nextConfig.output).toBe("standalone");
  });
  it("keeps the production CSP closed to arbitrary origins and eval", () => {
    const policy = createContentSecurityPolicy("production");
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).not.toContain("unsafe-eval");
    expect(policy).not.toContain("https:");
    expect(policy).not.toContain("*");
  });

  it("applies the security contract to every route", async () => {
    expect(clientSecurityHeaders.map(({ key }) => key)).toEqual(
      expect.arrayContaining([
        "Content-Security-Policy",
        "X-Content-Type-Options",
        "Referrer-Policy",
        "Permissions-Policy",
        "Strict-Transport-Security",
      ]),
    );
    expect(await nextConfig.headers?.()).toEqual([
      { source: "/(.*)", headers: clientSecurityHeaders },
    ]);
  });
});
