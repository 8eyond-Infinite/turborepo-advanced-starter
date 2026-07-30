import { describe, expect, it } from "vitest";
import { resolveClientEnvironment } from "./environment";

describe("resolveClientEnvironment", () => {
  it("provides development-only defaults", () => {
    expect(resolveClientEnvironment({ nodeEnv: "development" })).toEqual({
      apiUrl: "http://localhost:3001",
      sessionSecret: "dev-only-session-secret-do-not-use-in-prod",
    });
  });
  it("normalizes an explicit production contract", () => {
    expect(
      resolveClientEnvironment({
        nodeEnv: "production",
        apiUrl: "https://api.example.com/",
        sessionSecret: "production-session-secret-0123456789",
      }),
    ).toEqual({
      apiUrl: "https://api.example.com",
      sessionSecret: "production-session-secret-0123456789",
    });
  });
  it("rejects unsafe production values", () => {
    expect(() => resolveClientEnvironment({ nodeEnv: "production" })).toThrow(
      /API_URL/,
    );
    expect(() =>
      resolveClientEnvironment({
        nodeEnv: "production",
        apiUrl: "http://localhost:3001",
        sessionSecret: "a".repeat(32),
      }),
    ).toThrow(/localhost/);
    expect(() =>
      resolveClientEnvironment({
        nodeEnv: "production",
        apiUrl: "not-a-url",
        sessionSecret: "a".repeat(32),
      }),
    ).toThrow(/absolute/);
    expect(() =>
      resolveClientEnvironment({
        nodeEnv: "production",
        apiUrl: "https://api.example.com",
        sessionSecret: "short",
      }),
    ).toThrow(/32 characters/);
  });
});
