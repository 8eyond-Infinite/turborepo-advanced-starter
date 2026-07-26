import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "./session";

const getSession = vi.fn<() => Promise<Session | null>>();
vi.mock("./session", () => ({ getSession: () => getSession() }));

import { ApiError, apiFetch, apiFetchPublic } from "./api";

const fetchMock = vi.fn<typeof fetch>();

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
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
  it("gắn access token của phiên vào header Authorization", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: "u1" }));

    const result = await apiFetch<{ id: string }>("/users/me");

    expect(result).toEqual({ id: "u1" });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("/users/me");
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      "Bearer access-token",
    );
    // BFF luôn lấy dữ liệu mới — không để Next.js cache response có danh tính.
    expect(init?.cache).toBe("no-store");
  });

  it("ném ApiError 401 ngay khi chưa đăng nhập, không gọi API", async () => {
    getSession.mockResolvedValue(null);

    await expect(apiFetch("/users/me")).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lấy message từ body JSON khi API trả lỗi", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: "Hết quyền" }, 403));

    await expect(apiFetch("/users/me")).rejects.toMatchObject({
      message: "Hết quyền",
      status: 403,
    });
  });

  it("dùng thông điệp mặc định khi body lỗi không phải JSON", async () => {
    fetchMock.mockResolvedValue(
      new Response("<html>502</html>", { status: 502 }),
    );

    await expect(apiFetch("/users/me")).rejects.toMatchObject({
      message: "Yêu cầu thất bại (HTTP 502)",
      status: 502,
    });
  });

  it("caller ghi đè được header nhưng không mất Content-Type mặc định", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));

    await apiFetch("/users/me", { headers: { "X-Custom": "1" } });

    const [, init] = fetchMock.mock.calls[0]!;
    const headers = init?.headers as Record<string, string>;
    expect(headers["X-Custom"]).toBe("1");
    expect(headers["Content-Type"]).toBe("application/json");
  });
});

describe("apiFetchPublic", () => {
  it("gọi không kèm Authorization và không đọc session", async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ id: "p1" }]));

    await apiFetchPublic("/posts");

    expect(getSession).not.toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0]!;
    expect(
      (init?.headers as Record<string, string>).Authorization,
    ).toBeUndefined();
  });

  it("ném ApiError khi response không ok", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: "Không thấy" }, 404));

    await expect(apiFetchPublic("/posts/x")).rejects.toBeInstanceOf(ApiError);
  });
});
