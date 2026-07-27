import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient, ApiError } from "./api-client";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("ApiClient token refresh", () => {
  beforeEach(() => {
    ApiClient.setToken("expired-access-token");
  });

  afterEach(() => {
    ApiClient.setToken(null);
  });

  it("shares one refresh request between concurrent unauthorized requests", async () => {
    let protectedRequestCount = 0;
    let refreshRequestCount = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).endsWith("/auth/refresh")) {
          refreshRequestCount += 1;
          // Refresh dựa vào HttpOnly cookie: không gửi Authorization header,
          // và phải bật credentials để trình duyệt đính kèm cookie.
          expect(new Headers(init?.headers).get("Authorization")).toBeNull();
          expect(init?.credentials).toBe("include");
          return jsonResponse({ accessToken: "fresh-access-token" });
        }

        protectedRequestCount += 1;
        const authorization = new Headers(init?.headers).get("Authorization");
        return authorization === "Bearer fresh-access-token"
          ? jsonResponse({ ok: true })
          : jsonResponse({ message: "Expired" }, 401);
      }),
    );

    const [first, second] = await Promise.all([
      ApiClient.get<{ ok: boolean }>("/users"),
      ApiClient.get<{ ok: boolean }>("/roles"),
    ]);

    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: true });
    expect(refreshRequestCount).toBe(1);
    expect(protectedRequestCount).toBe(4);
    expect(ApiClient.getToken()).toBe("fresh-access-token");
  });

  it("expires the local session and emits logout when refresh fails", async () => {
    const logoutListener = vi.fn();
    window.addEventListener("auth:logout", logoutListener);

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) =>
        String(input).endsWith("/auth/refresh")
          ? jsonResponse({ message: "Refresh token revoked" }, 401)
          : jsonResponse({ message: "Expired" }, 401),
      ),
    );

    await expect(ApiClient.get("/users")).rejects.toMatchObject({
      status: 401,
      message: "Refresh token revoked",
    });

    expect(ApiClient.getToken()).toBeNull();
    expect(logoutListener).toHaveBeenCalledOnce();
    window.removeEventListener("auth:logout", logoutListener);
  });

  it("does not refresh repeatedly when the retried request remains unauthorized", async () => {
    let refreshRequestCount = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).endsWith("/auth/refresh")) {
          refreshRequestCount += 1;
          return jsonResponse({ accessToken: "fresh-access-token" });
        }
        return jsonResponse({ message: "Still unauthorized" }, 401);
      }),
    );

    await expect(ApiClient.get("/users")).rejects.toBeInstanceOf(ApiError);
    expect(refreshRequestCount).toBe(1);
  });

  it("keeps the backend correlation ID on API errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ message: "Unavailable" }), {
            status: 503,
            headers: {
              "Content-Type": "application/json",
              "x-correlation-id": "correlation-123",
            },
          }),
      ),
    );

    await expect(
      ApiClient.get("/health", { skipAuth: true }),
    ).rejects.toMatchObject({
      status: 503,
      correlationId: "correlation-123",
    });
  });
});
