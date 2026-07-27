import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api-client";
import { createAdminQueryClient, shouldRetryQuery } from "./query-client";

describe("admin query client policy", () => {
  it.each([400, 401, 403, 404, 409, 422])(
    "does not retry a permanent HTTP %s response",
    (status) => {
      expect(shouldRetryQuery(0, new ApiError("request failed", status))).toBe(
        false,
      );
    },
  );

  it.each([408, 429, 500, 502, 503])(
    "retries a transient HTTP %s response",
    (status) => {
      expect(shouldRetryQuery(0, new ApiError("request failed", status))).toBe(
        true,
      );
    },
  );

  it("retries browser network failures but stops after two failures", () => {
    const networkError = new TypeError("Failed to fetch");

    expect(shouldRetryQuery(0, networkError)).toBe(true);
    expect(shouldRetryQuery(1, networkError)).toBe(true);
    expect(shouldRetryQuery(2, networkError)).toBe(false);
  });

  it("keeps mutations non-retrying because commands may not be idempotent", () => {
    const client = createAdminQueryClient();

    expect(client.getDefaultOptions().mutations?.retry).toBe(false);
  });
});
