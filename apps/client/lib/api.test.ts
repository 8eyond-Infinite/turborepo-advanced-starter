import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "./session";

const getSession = vi.fn<() => Promise<Session | null>>();
vi.mock("./session", () => ({ getSession: () => getSession() }));

import { ApiError, apiFetch, apiFetchPublic, toPublicApiError } from "./api";

const fetchMock = vi.fn<typeof fetch>();

const jsonResponse = (
  body: unknown,
  status = 200,
  headers?: HeadersInit,
): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  getSession.mockResolvedValue({
    accessToken: "access-token",
    refreshToken: "refresh-token",
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("apiFetch", () => {
  it("gắn access token và timeout signal vào request phía server", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: "u1" }));

    const result = await apiFetch<{ id: string }>("/users/me");

    expect(result).toEqual({ id: "u1" });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("/users/me");
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer access-token",
    );
    expect(init?.cache).toBe("no-store");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("nếu caller có signal thì vẫn giữ cả cancellation lẫn timeout", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    const controller = new AbortController();

    await apiFetch("/users/me", { signal: controller.signal });

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init?.signal).not.toBe(controller.signal);
    controller.abort();
    expect(init?.signal?.aborted).toBe(true);
  });

  it("nén lỗi chưa đăng nhập thành contract có kiểu và không gọi API", async () => {
    getSession.mockResolvedValue(null);

    await expect(apiFetch("/users/me")).rejects.toMatchObject({
      name: "ApiError",
      kind: "unauthenticated",
      status: 401,
      retryable: false,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("giữ code và correlation ID nhưng không lộ raw backend message", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          code: "FORBIDDEN",
          translationKey: "exceptions.forbidden",
          message: "raw internal detail",
        },
        403,
        { "x-correlation-id": "request-123" },
      ),
    );

    await expect(apiFetch("/users/me")).rejects.toMatchObject({
      message: "Bạn không có quyền thực hiện thao tác này.",
      kind: "forbidden",
      status: 403,
      code: "FORBIDDEN",
      translationKey: "exceptions.forbidden",
      correlationId: "request-123",
      retryable: false,
    });
  });

  it("phân loại response lỗi không phải JSON theo status", async () => {
    fetchMock.mockResolvedValue(
      new Response("<html>502</html>", { status: 502 }),
    );

    await expect(apiFetch("/users/me")).rejects.toMatchObject({
      message: "Dịch vụ đang tạm thời gặp sự cố. Vui lòng thử lại.",
      kind: "upstream",
      status: 502,
      retryable: true,
    });
  });

  it("phân biệt timeout với lỗi mạng", async () => {
    fetchMock.mockRejectedValueOnce(
      new DOMException("timed out", "TimeoutError"),
    );
    await expect(apiFetch("/users/me")).rejects.toMatchObject({
      kind: "timeout",
      status: null,
      retryable: true,
    });

    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(apiFetch("/users/me")).rejects.toMatchObject({
      kind: "network",
      status: null,
      retryable: true,
    });
  });

  it("chuẩn hóa mọi dạng HeadersInit và không cho caller ghi đè danh tính", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));

    await apiFetch("/users/me", {
      headers: new Headers({
        "X-Custom": "1",
        Authorization: "Bearer attacker-controlled",
      }),
    });

    const [, init] = fetchMock.mock.calls[0]!;
    const headers = new Headers(init?.headers);
    expect(headers.get("X-Custom")).toBe("1");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Authorization")).toBe("Bearer access-token");
  });

  it("hỗ trợ response 204 và phân loại JSON thành công bị hỏng", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(
      apiFetch<void>("/users/me", { method: "DELETE" }),
    ).resolves.toBeUndefined();

    fetchMock.mockResolvedValueOnce(
      new Response("<not-json>", {
        status: 200,
        headers: { "x-correlation-id": "request-invalid-json" },
      }),
    );
    await expect(apiFetch("/users/me")).rejects.toMatchObject({
      kind: "unexpected",
      status: 200,
      correlationId: "request-invalid-json",
      retryable: false,
    });
  });
});

describe("apiFetchPublic", () => {
  it("gọi không kèm Authorization và không đọc session", async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ id: "p1" }]));

    await apiFetchPublic("/posts");

    expect(getSession).not.toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0]!;
    expect(new Headers(init?.headers).has("Authorization")).toBe(false);
  });
});

describe("toPublicApiError", () => {
  it("chỉ trả dữ liệu an toàn, tuần tự hóa được cho UI", () => {
    const error = new ApiError({
      kind: "conflict",
      status: 409,
      code: "INTERNAL_CODE",
      translationKey: "internal.key",
      correlationId: "request-456",
      message: "Dữ liệu đang xung đột.",
    });

    expect(toPublicApiError(error)).toEqual({
      kind: "conflict",
      message: "Dữ liệu đang xung đột.",
      correlationId: "request-456",
    });
    expect(toPublicApiError(new Error("secret detail"))).toEqual({
      kind: "unexpected",
      message: "Đã xảy ra lỗi. Vui lòng thử lại.",
    });
  });
});
