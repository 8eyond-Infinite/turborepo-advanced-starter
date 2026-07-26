import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  decodeSession,
  encodeSession,
  sessionCookieOptions,
} from "@/lib/session";

const PROTECTED_PREFIXES = ["/me"];
const REFRESH_THRESHOLD_SECONDS = 60;

// Đọc trường exp của JWT mà KHÔNG xác minh chữ ký: ở đây chỉ cần biết token
// sắp hết hạn chưa. Việc xác minh thật do API làm.
const expiresAt = (token: string): number => {
  const payload = token.split(".")[1];
  if (!payload) return 0;
  try {
    const decoded: unknown = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    );
    const exp = (decoded as { exp?: unknown })?.exp;
    return typeof exp === "number" ? exp : 0;
  } catch {
    return 0;
  }
};

export async function middleware(request: NextRequest) {
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  const session = raw ? decodeSession(raw) : null;

  if (!session) {
    if (!isProtected) return NextResponse.next();
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const secondsLeft =
    expiresAt(session.accessToken) - Math.floor(Date.now() / 1000);
  if (secondsLeft > REFRESH_THRESHOLD_SECONDS) {
    return NextResponse.next();
  }

  // Làm mới token TẠI ĐÂY, không phải trong lúc render: Next.js chỉ cho ghi
  // cookie ở middleware, Server Action và Route Handler. Nhờ vậy mỗi lần
  // render trang đã chắc chắn có access token còn hạn.
  const refreshed = await fetch(
    `${process.env.API_URL ?? "http://localhost:3001"}/auth/refresh`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${session.refreshToken}` },
      cache: "no-store",
    },
  ).catch(() => null);

  if (!refreshed?.ok) {
    const response = isProtected
      ? NextResponse.redirect(new URL("/login", request.url))
      : NextResponse.next();
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  const tokens = (await refreshed.json()) as {
    accessToken: string;
    refreshToken?: string;
  };
  const response = NextResponse.next();
  response.cookies.set(
    SESSION_COOKIE,
    encodeSession({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? session.refreshToken,
    }),
    sessionCookieOptions,
  );
  return response;
}

export const config = {
  // Bỏ qua asset tĩnh để middleware không chạy vô ích trên mỗi file.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
