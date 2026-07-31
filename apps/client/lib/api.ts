import "server-only";
import type { ApiErrorResponse } from "@repo/contracts";
import { clientEnvironment } from "./environment";
import { reportApiFailure } from "./observability";
import { getSession } from "./session";

// API_URL không có tiền tố NEXT_PUBLIC_: nó chỉ được đọc ở phía server.
// Trình duyệt không bao giờ biết địa chỉ API, cũng không gọi thẳng vào đó.
export const API_URL = clientEnvironment.apiUrl;
export const API_REQUEST_TIMEOUT_MS = 10_000;

export type ApiErrorKind =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "validation"
  | "conflict"
  | "rate_limited"
  | "upstream"
  | "network"
  | "timeout"
  | "cancelled"
  | "unexpected";

export interface PublicApiError {
  kind: ApiErrorKind;
  message: string;
  correlationId?: string;
}

interface ApiErrorOptions extends PublicApiError {
  status: number | null;
  code?: string;
  translationKey?: string;
  retryable?: boolean;
}

/**
 * Lỗi đã được chuẩn hóa tại ranh giới Next.js -> API.
 *
 * `message` luôn an toàn để hiển thị. Chi tiết backend không được sao chép vào
 * Error vì error có thể đi tới error boundary hoặc Server Action response.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly code?: string;
  readonly translationKey?: string;
  readonly correlationId?: string;
  readonly retryable: boolean;

  constructor({
    message,
    kind,
    status,
    code,
    translationKey,
    correlationId,
    retryable = false,
  }: ApiErrorOptions) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.translationKey = translationKey;
    this.correlationId = correlationId;
    this.retryable = retryable;
  }
}

const errorDescriptor = (
  status: number,
): Pick<ApiErrorOptions, "kind" | "message" | "retryable"> => {
  if (status === 400 || status === 422)
    return {
      kind: "validation",
      message: "Dữ liệu gửi lên không hợp lệ.",
      retryable: false,
    };
  if (status === 401)
    return {
      kind: "unauthenticated",
      message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
      retryable: false,
    };
  if (status === 403)
    return {
      kind: "forbidden",
      message: "Bạn không có quyền thực hiện thao tác này.",
      retryable: false,
    };
  if (status === 404)
    return {
      kind: "not_found",
      message: "Không tìm thấy dữ liệu được yêu cầu.",
      retryable: false,
    };
  if (status === 409)
    return {
      kind: "conflict",
      message: "Dữ liệu đã thay đổi hoặc đang xung đột.",
      retryable: false,
    };
  if (status === 429)
    return {
      kind: "rate_limited",
      message: "Có quá nhiều yêu cầu. Vui lòng thử lại sau.",
      retryable: true,
    };
  if (status >= 500)
    return {
      kind: "upstream",
      message: "Dịch vụ đang tạm thời gặp sự cố. Vui lòng thử lại.",
      retryable: true,
    };
  return {
    kind: "unexpected",
    message: "Không thể hoàn tất yêu cầu.",
    retryable: false,
  };
};

const readErrorContract = async (
  response: Response,
): Promise<Partial<ApiErrorResponse>> => {
  try {
    const body: unknown = await response.json();
    if (!body || typeof body !== "object") return {};
    const candidate = body as Record<string, unknown>;
    return {
      code: typeof candidate.code === "string" ? candidate.code : undefined,
      translationKey:
        typeof candidate.translationKey === "string"
          ? candidate.translationKey
          : undefined,
    };
  } catch {
    return {};
  }
};

const responseError = async (
  response: Response,
  requestCorrelationId: string,
): Promise<ApiError> => {
  const contract = await readErrorContract(response);
  return new ApiError({
    ...errorDescriptor(response.status),
    status: response.status,
    code: contract.code,
    translationKey: contract.translationKey,
    correlationId:
      response.headers.get("x-correlation-id") ?? requestCorrelationId,
  });
};

const transportError = (error: unknown, correlationId: string): ApiError => {
  if (error instanceof ApiError) return error;
  if (error instanceof Error && error.name === "TimeoutError")
    return new ApiError({
      kind: "timeout",
      status: null,
      message: "Dịch vụ phản hồi quá lâu. Vui lòng thử lại.",
      correlationId,
      retryable: true,
    });
  if (error instanceof Error && error.name === "AbortError")
    return new ApiError({
      kind: "cancelled",
      status: null,
      message: "Yêu cầu đã bị hủy.",
      correlationId,
      retryable: false,
    });
  return new ApiError({
    kind: "network",
    status: null,
    message: "Không thể kết nối tới dịch vụ. Vui lòng thử lại.",
    correlationId,
    retryable: true,
  });
};

const requestApi = async <T>(
  path: string,
  init: RequestInit | undefined,
  authorization?: string,
): Promise<T> => {
  const timeoutSignal = AbortSignal.timeout(API_REQUEST_TIMEOUT_MS);
  const signal = init?.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;
  const headers = new Headers(init?.headers);
  const correlationId = headers.get("x-correlation-id") ?? crypto.randomUUID();
  headers.set("x-correlation-id", correlationId);
  if (!headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  // Danh tính luôn do BFF lấy từ session; caller không được ghi đè bearer
  // bằng một giá trị truyền qua RequestInit.
  if (authorization) headers.set("Authorization", authorization);

  const startedAt = performance.now();
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      cache: "no-store",
      signal,
    });
    if (!response.ok) throw await responseError(response, correlationId);
    if (response.status === 204) return undefined as T;
    try {
      return (await response.json()) as T;
    } catch {
      throw new ApiError({
        kind: "unexpected",
        status: response.status,
        message: "Dịch vụ trả về dữ liệu không hợp lệ.",
        correlationId:
          response.headers.get("x-correlation-id") ?? correlationId,
        retryable: false,
      });
    }
  } catch (error) {
    const normalized = transportError(error, correlationId);
    if (normalized.kind !== "cancelled")
      reportApiFailure({
        event: "client.bff.api_failed",
        correlationId: normalized.correlationId ?? correlationId,
        method: init?.method?.toUpperCase() ?? "GET",
        path: path.split("?")[0] || "/",
        kind: normalized.kind,
        status: normalized.status,
        retryable: normalized.retryable,
        durationMs: Math.round(performance.now() - startedAt),
      });
    throw normalized;
  }
};

/** Chuyển unknown thành dữ liệu nhỏ, tuần tự hóa được và an toàn cho UI. */
export const toPublicApiError = (
  error: unknown,
  fallbackMessage = "Đã xảy ra lỗi. Vui lòng thử lại.",
): PublicApiError =>
  error instanceof ApiError
    ? {
        kind: error.kind,
        message: error.message,
        ...(error.correlationId ? { correlationId: error.correlationId } : {}),
      }
    : { kind: "unexpected", message: fallbackMessage };

/** Gọi API công khai (không cần đăng nhập). */
export async function apiFetchPublic<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  return requestApi<T>(path, init);
}

/**
 * Gọi API với danh tính của người dùng đang đăng nhập — chạy phía server,
 * dùng access token lấy từ session cookie. Token hết hạn đã được Proxy
 * làm mới trước khi request tới đây.
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const session = await getSession();
  if (!session) {
    throw new ApiError({
      kind: "unauthenticated",
      status: 401,
      message: "Bạn cần đăng nhập để tiếp tục.",
      retryable: false,
    });
  }

  return requestApi<T>(path, init, `Bearer ${session.accessToken}`);
}
