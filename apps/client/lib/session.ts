import "server-only";
import { cookies } from "next/headers";
import { EncryptJWT, jwtDecrypt } from "jose";
import { clientEnvironment } from "./environment";

// Phiên đăng nhập do CHÍNH Next.js sở hữu, không phải API. Trình duyệt chỉ
// thấy một cookie HttpOnly; token không bao giờ xuống JavaScript phía client.
export const SESSION_COOKIE = "client_session";

const SEVEN_DAYS = "7d";
const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;

export interface Session {
  accessToken: string;
  refreshToken: string;
}

// Nội dung cookie được MÃ HÓA (JWE, thuật toán dir + A256GCM) bằng khóa sinh
// từ SESSION_SECRET. Ai cầm được cookie mà không có khóa thì không đọc được
// token bên trong, và sửa một byte là giải mã thất bại. Giới hạn còn lại:
// kẻ trộm được nguyên cookie vẫn dùng được phiên — đúng bản chất của mọi
// session cookie; chống chuyện đó bằng HttpOnly + Secure + SameSite.
let cachedKey: Promise<Uint8Array> | null = null;
let warnedDevSecret = false;

const secretKey = (): Promise<Uint8Array> => {
  if (cachedKey) return cachedKey;

  let secret = clientEnvironment.sessionSecret;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SESSION_SECRET phải được đặt (tối thiểu 32 ký tự) khi chạy production.",
      );
    }
    // Khóa cố định cho dev để clone repo là chạy được ngay; cảnh báo một lần
    // để không ai mang nó lên production (ở đó thiếu secret là chết ngay).
    secret = "dev-only-session-secret-do-not-use-in-prod";
    if (!warnedDevSecret) {
      warnedDevSecret = true;
      console.warn(
        "[session] SESSION_SECRET chưa đặt — đang dùng khóa dev mặc định.",
      );
    }
  }

  // A256GCM cần khóa đúng 256 bit; băm SHA-256 để secret độ dài bất kỳ luôn
  // cho ra khóa đúng cỡ. Dùng Web Crypto để implementation không phụ thuộc
  // API crypto riêng của một runtime.
  cachedKey = crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(secret))
    .then((hash) => new Uint8Array(hash));
  return cachedKey;
};

export const encryptSession = async (session: Session): Promise<string> =>
  new EncryptJWT({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    // Trùng với maxAge của cookie: quá hạn thì giải mã cũng bị từ chối,
    // phòng trường hợp cookie bị giữ lại ở đâu đó ngoài trình duyệt.
    .setExpirationTime(SEVEN_DAYS)
    .encrypt(await secretKey());

export const decryptSession = async (raw: string): Promise<Session | null> => {
  try {
    const { payload } = await jwtDecrypt(raw, await secretKey());
    if (
      typeof payload.accessToken === "string" &&
      typeof payload.refreshToken === "string"
    ) {
      return {
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
      };
    }
    return null;
  } catch {
    // Cookie rác, bị sửa, hết hạn, hoặc mã hóa bằng secret cũ — đều coi như
    // chưa đăng nhập, không bao giờ để lỗi giải mã làm crash trang.
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
  return raw ? decryptSession(raw) : null;
}

// Chỉ gọi được trong Server Action hoặc Route Handler — Next.js không cho
// ghi cookie trong lúc render. Việc làm mới token định kỳ vì vậy nằm ở
// Proxy (xem proxy.ts).
export async function setSession(session: Session): Promise<void> {
  (await cookies()).set(
    SESSION_COOKIE,
    await encryptSession(session),
    sessionCookieOptions,
  );
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
