import "server-only";
import { cookies } from "next/headers";

// Phiên đăng nhập do CHÍNH Next.js sở hữu, không phải API. Trình duyệt chỉ
// thấy một cookie HttpOnly; token không bao giờ xuống JavaScript phía client.
export const SESSION_COOKIE = "client_session";

const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;

export interface Session {
  accessToken: string;
  refreshToken: string;
}

// Base64 chỉ để đóng gói, KHÔNG phải mã hóa. Cookie đã là HttpOnly + Secure
// nên JavaScript không đọc được, nhưng ai lấy được cookie thì có token —
// đúng mức rủi ro của một session cookie thông thường. Hệ thống cần mức cao
// hơn thì mã hóa nội dung (iron-session) hoặc chuyển sang session store
// phía server và chỉ đặt session id vào cookie.
export const encodeSession = (session: Session): string =>
  Buffer.from(JSON.stringify(session)).toString("base64url");

export const decodeSession = (raw: string): Session | null => {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(raw, "base64url").toString(),
    );
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as Session).accessToken === "string" &&
      typeof (parsed as Session).refreshToken === "string"
    ) {
      return parsed as Session;
    }
    return null;
  } catch {
    return null;
  }
};

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SEVEN_DAYS_SECONDS,
};

export async function getSession(): Promise<Session | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  return raw ? decodeSession(raw) : null;
}

// Chỉ gọi được trong Server Action hoặc Route Handler — Next.js không cho
// ghi cookie trong lúc render. Việc làm mới token định kỳ vì vậy nằm ở
// middleware (xem middleware.ts).
export async function setSession(session: Session): Promise<void> {
  (await cookies()).set(
    SESSION_COOKIE,
    encodeSession(session),
    sessionCookieOptions,
  );
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
