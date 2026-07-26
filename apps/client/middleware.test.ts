import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// session.ts import next/headers ở đầu file; trong Node thuần module đó không
// có request scope nên mock rỗng cho an toàn — middleware không dùng tới nó
// (middleware đọc cookie từ request, không qua cookies()).
vi.mock("next/headers", () => ({ cookies: () => Promise.resolve(null) }));

import { middleware } from "./middleware";
import { SESSION_COOKIE, decryptSession, encryptSession } from "@/lib/session";

const fetchMock = vi.fn<typeof fetch>();

// Access token giả đúng cấu trúc JWT (header.payload.signature) — middleware
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
    const response = await middleware(requestFor("/"));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("chặn trang riêng tư, chuyển về /login kèm đường dẫn quay lại", async () => {
    const response = await middleware(requestFor("/me"));
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/me");
  });

  it("cookie rác được coi như chưa đăng nhập", async () => {
    // Header HTTP chỉ chứa được byte Latin-1 nên chuỗi rác phải là ASCII.
    const response = await middleware(requestFor("/me", "@@not-a-session@@"));
    expect(response.status).toBe(307);
  });
});

describe("khi token còn hạn dài", () => {
  it("cho qua và KHÔNG gọi refresh", async () => {
    const cookie = await encryptSession({
      accessToken: tokenExpiringIn(15 * 60),
      refreshToken: "refresh-token",
    });

    const response = await middleware(requestFor("/me", cookie));

    expect(response.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("khi token sắp hết hạn (dưới 60 giây)", () => {
  const nearExpiry = () =>
    encryptSession({
      accessToken: tokenExpiringIn(30),
      refreshToken: "old-refresh",
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

    const response = await middleware(requestFor("/me", await nearExpiry()));

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("/auth/refresh");
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      "Bearer old-refresh",
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

    const response = await middleware(requestFor("/me", await nearExpiry()));

    const written = response.cookies.get(SESSION_COOKIE)?.value;
    expect(await decryptSession(written!)).toEqual({
      accessToken: "new-access",
      refreshToken: "old-refresh",
    });
  });

  it("refresh thất bại trên trang riêng tư: xóa cookie và về /login", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    const response = await middleware(requestFor("/me", await nearExpiry()));

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/login");
    // Cookie bị xóa = được ghi đè bằng giá trị rỗng đã hết hạn.
    expect(response.cookies.get(SESSION_COOKIE)?.value).toBe("");
  });

  it("refresh thất bại trên trang công khai: vẫn cho qua nhưng xóa cookie", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    const response = await middleware(requestFor("/", await nearExpiry()));

    expect(response.status).toBe(200);
    expect(response.cookies.get(SESSION_COOKIE)?.value).toBe("");
  });

  it("API sập (fetch ném lỗi) được xử lý như refresh thất bại", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

    const response = await middleware(requestFor("/me", await nearExpiry()));

    expect(response.status).toBe(307);
  });
});

describe("access token hỏng cấu trúc", () => {
  it("coi như hết hạn ngay và đi vào nhánh refresh", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    const cookie = await encryptSession({
      accessToken: "không-phải-jwt",
      refreshToken: "refresh-token",
    });

    const response = await middleware(requestFor("/me", cookie));

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(response.status).toBe(307);
  });
});
