import "server-only";
import { getSession } from "./session";

// API_URL không có tiền tố NEXT_PUBLIC_: nó chỉ được đọc ở phía server.
// Trình duyệt không bao giờ biết địa chỉ API, cũng không gọi thẳng vào đó.
export const API_URL = process.env.API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "message" in body) {
      const message = (body as { message: unknown }).message;
      if (typeof message === "string") return message;
    }
  } catch {
    /* body không phải JSON — dùng thông điệp mặc định bên dưới */
  }
  return `Yêu cầu thất bại (HTTP ${response.status})`;
};

/** Gọi API công khai (không cần đăng nhập). */
export async function apiFetchPublic<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }
  return (await response.json()) as T;
}

/**
 * Gọi API với danh tính của người dùng đang đăng nhập — chạy phía server,
 * dùng access token lấy từ session cookie. Token hết hạn đã được middleware
 * làm mới trước khi request tới đây.
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const session = await getSession();
  if (!session) {
    throw new ApiError("Chưa đăng nhập", 401);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.accessToken}`,
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }
  return (await response.json()) as T;
}
