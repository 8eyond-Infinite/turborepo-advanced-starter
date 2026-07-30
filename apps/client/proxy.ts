import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  decryptSession,
  encryptSession,
  sessionCookieOptions,
} from "@/lib/session";
import { refreshSessionSingleFlight } from "@/lib/refresh-session";

const PROTECTED_PREFIXES = ["/me"];
const REFRESH_THRESHOLD_SECONDS = 60;

const loginUrlFor = (request: NextRequest): URL => {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  return loginUrl;
};

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

export async function proxy(request: NextRequest) {
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  const session = raw ? await decryptSession(raw) : null;

  if (!session) {
    if (!isProtected) return NextResponse.next();
    return NextResponse.redirect(loginUrlFor(request));
  }

  const secondsLeft =
    expiresAt(session.accessToken) - Math.floor(Date.now() / 1000);
  if (secondsLeft > REFRESH_THRESHOLD_SECONDS) {
    return NextResponse.next();
  }

  // Làm mới token TẠI ĐÂY, không phải trong lúc render: Next.js chỉ cho ghi
  // cookie ở Proxy, Server Action và Route Handler. Nhờ vậy mỗi lần
  // render trang đã chắc chắn có access token còn hạn.
  const refreshed = await refreshSessionSingleFlight(session.refreshToken);

  if (!refreshed) {
    // Một replica khác có thể vừa consume cùng refresh token và đang trả về
    // cookie mới. Khi access token cũ vẫn còn hạn, không ghi cookie xóa ở response
    // thua cuộc; request hiện tại vẫn dùng được token cũ và response thắng có thể
    // cập nhật trình duyệt mà không bị ghi đè.
    if (secondsLeft > 0) {
      return NextResponse.next();
    }
    const response = isProtected
      ? NextResponse.redirect(loginUrlFor(request))
      : NextResponse.next();
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  const response = NextResponse.next();
  response.cookies.set(
    SESSION_COOKIE,
    await encryptSession({
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
    }),
    sessionCookieOptions,
  );
  return response;
}

export const config = {
  // Bỏ qua asset tĩnh để Proxy không chạy vô ích trên mỗi file.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
