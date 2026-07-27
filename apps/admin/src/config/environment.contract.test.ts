import { describe, expect, it } from "vitest";
import {
  createContentSecurityPolicy,
  resolveAdminEnvironment,
} from "./environment.contract";

describe("Admin environment contract", () => {
  it("uses localhost only in development", () => {
    expect(resolveAdminEnvironment({ mode: "development" })).toEqual({
      apiUrl: "http://localhost:3001",
    });
    expect(() => resolveAdminEnvironment({ mode: "production" })).toThrow(
      /VITE_API_URL is required/,
    );
  });

  it("rejects malformed, non-HTTP and production localhost URLs", () => {
    expect(() =>
      resolveAdminEnvironment({ apiUrl: "not-a-url", mode: "preview" }),
    ).toThrow(/absolute HTTP/);
    expect(() =>
      resolveAdminEnvironment({
        apiUrl: "ftp://api.example.com",
        mode: "preview",
      }),
    ).toThrow(/http or https/);
    expect(() =>
      resolveAdminEnvironment({
        apiUrl: "http://127.0.0.1:3001",
        mode: "production",
      }),
    ).toThrow(/must not target localhost/);
  });

  it("normalizes trailing slashes and scopes CSP connections to the API", () => {
    const environment = resolveAdminEnvironment({
      apiUrl: "https://api.example.com///",
      mode: "production",
    });

    expect(environment.apiUrl).toBe("https://api.example.com");
    expect(createContentSecurityPolicy(environment)).toContain(
      "connect-src 'self' https://api.example.com wss://api.example.com",
    );
  });
});
