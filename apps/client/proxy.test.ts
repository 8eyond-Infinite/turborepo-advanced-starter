import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// session.ts import next/headers ở đầu file; trong Node thuần module đó không
// có request scope nên mock rỗng cho an toàn — Proxy không dùng tới nó
// (Proxy đọc cookie từ request, không qua cookies()).
vi.mock("next/headers", () => ({ cookies: () => Promise.resolve(null) }));

import { proxy } from "./proxy";
import { SESSION_COOKIE, decryptSession, encryptSession } from "@/lib/session";

const fetchMock = vi.fn<typeof fetch>();

// Access token giả đúng cấu trúc JWT (header.payload.signature) — Proxy
// chỉ đọc trường exp trong payload, không xác minh chữ ký.
const tokenExpiringIn = (seconds: number): string => {
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds }),
  ).toString("base64url");
  return `header.${payload}.signature`;
};

const requestFor = (path: string, sessionCookie?: string): NextRequest =>
  new NextRequest(`http://localhost:3005${path}`, {
    headers: sessionCookie
      ? { cookie: `${SESSION_COOKIE}=${sessionCookie}` }
      : {},
  });

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("khi chưa có phiên", () => {
  it("cho qua trang công khai", async () => {
    const response = await proxy(requestFor("/"));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("chặn trang riêng tư, chuyển về /login kèm đường dẫn quay lại", async () => {
    const response = await proxy(requestFor("/me"));
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/me");
  });

  it("cookie rác được coi như chưa đăng nhập", async () => {
    // Header HTTP chỉ chứa được byte Latin-1 nên chuỗi rác phải là ASCII.
    const response = await proxy(requestFor("/me", "@@not-a-session@@"));
    expect(response.status).toBe(307);
  });
});

describe("khi token còn hạn dài", () => {
  it("cho qua và KHÔNG gọi refresh", async () => {
    const cookie = await encryptSession({
      accessToken: tokenExpiringIn(15 * 60),
      refreshToken: "refresh-token",
    });

    const response = await proxy(requestFor("/me", cookie));

    expect(response.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("khi token sắp hết hạn (dưới 60 giây)", () => {
  const nearExpiry = (refreshToken: string) =>
    encryptSession({
      accessToken: tokenExpiringIn(30),
      refreshToken,
    });

  it("gọi /auth/refresh bằng refresh token và ghi phiên mới vào cookie", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: "new-access",
          refreshToken: "new-refresh",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const response = await proxy(
      requestFor("/me", await nearExpiry("refresh-to-rotate")),
    );

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("/auth/refresh");
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      "Bearer refresh-to-rotate",
    );

    const written = response.cookies.get(SESSION_COOKIE)?.value;
    expect(await decryptSession(written!)).toEqual({
      accessToken: "new-access",
      refreshToken: "new-refresh",
    });
  });

  it("giữ refresh token cũ nếu API không xoay vòng nó", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ accessToken: "new-access" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = await proxy(
      requestFor("/me", await nearExpiry("refresh-without-rotation")),
    );

    const written = response.cookies.get(SESSION_COOKIE)?.value;
    expect(await decryptSession(written!)).toEqual({
      accessToken: "new-access",
      refreshToken: "refresh-without-rotation",
    });
  });

  it("refresh cạnh tranh thất bại khi access token còn hạn: giữ cookie và cho request hiện tại đi tiếp", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    const response = await proxy(
      requestFor("/me", await nearExpiry("refresh-race-loser")),
    );

    expect(response.status).toBe(200);
    expect(response.cookies.get(SESSION_COOKIE)).toBeUndefined();
  });

  it("refresh thất bại trên trang công khai khi token còn hạn: cho qua và không ghi đè cookie", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    const response = await proxy(
      requestFor("/", await nearExpiry("refresh-public-race-loser")),
    );

    expect(response.status).toBe(200);
    expect(response.cookies.get(SESSION_COOKIE)).toBeUndefined();
  });

  it("API sập khi token còn hạn: cho request hiện tại đi tiếp", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

    const response = await proxy(
      requestFor("/me", await nearExpiry("refresh-api-down")),
    );

    expect(response.status).toBe(200);
  });

  it("token đã hết hạn và refresh thất bại: xóa cookie rồi về login", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    const cookie = await encryptSession({
      accessToken: tokenExpiringIn(-1),
      refreshToken: "expired-refresh",
    });

    const response = await proxy(requestFor("/me", cookie));

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/me");
    expect(response.cookies.get(SESSION_COOKIE)?.value).toBe("");
  });
});

describe("access token hỏng cấu trúc", () => {
  it("coi như hết hạn ngay và đi vào nhánh refresh", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    const cookie = await encryptSession({
      accessToken: "không-phải-jwt",
      refreshToken: "refresh-token",
    });

    const response = await proxy(requestFor("/me", cookie));

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(response.status).toBe(307);
  });
});
