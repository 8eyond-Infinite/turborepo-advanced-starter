import { adminEnvironment } from "@/config/environment";

const API_URL = adminEnvironment.apiUrl;

type JsonObject = Record<string, unknown>;

interface ErrorResponse extends JsonObject {
  message?: string;
  code?: string;
  error?: string;
  details?: unknown;
  translationKey?: string;
  args?: Record<string, unknown>;
}

interface RefreshResponse {
  accessToken: string;
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  skipRefresh?: boolean;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: unknown;
  public readonly translationKey?: string;
  public readonly args?: Record<string, unknown>;
  public readonly correlationId?: string;

  constructor(
    message: string,
    status: number,
    options: {
      code?: string;
      details?: unknown;
      translationKey?: string;
      args?: Record<string, unknown>;
      correlationId?: string;
    } = {},
  ) {
    super(message);
    this.status = status;
    this.code = options.code;
    this.details = options.details;
    this.translationKey = options.translationKey;
    this.args = options.args;
    this.correlationId = options.correlationId;
    this.name = "ApiError";
  }
}

export class ApiClient {
  private static accessToken: string | null = null;
  private static refreshPromise: Promise<string> | null = null;

  public static setToken(token: string | null): void {
    this.accessToken = token;
  }

  public static getToken(): string | null {
    return this.accessToken;
  }

  public static async request<T>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      // Refresh token sống trong HttpOnly cookie — trình duyệt tự gửi kèm
      // khi gọi các endpoint /auth/*, JavaScript không thấy giá trị.
      credentials: "include",
      headers: this.createHeaders(options),
    });

    if (response.status === 401 && !options.skipAuth && !options.skipRefresh) {
      const token = await this.refreshAccessToken();
      return this.request<T>(path, {
        ...options,
        skipRefresh: true,
        headers: this.createHeaders(options, token),
      });
    }

    if (!response.ok) {
      throw await this.createApiError(response);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  private static createHeaders(
    options: RequestOptions,
    token = this.accessToken,
  ): Headers {
    const headers = new Headers(options.headers);

    if (!options.skipAuth && token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    if (options.body && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    return headers;
  }

  private static refreshAccessToken(): Promise<string> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.performTokenRefresh().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  private static async performTokenRefresh(): Promise<string> {
    try {
      // Không đính kèm gì cả: HttpOnly cookie refresh_token tự đi theo
      // request. Server rotate cookie và chỉ trả access token trong body.
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw await this.createApiError(response);
      }

      const tokens = (await response.json()) as RefreshResponse;
      this.accessToken = tokens.accessToken;
      window.dispatchEvent(
        new CustomEvent<string>("auth:token-refreshed", {
          detail: tokens.accessToken,
        }),
      );
      return tokens.accessToken;
    } catch (error: unknown) {
      this.expireSession();
      throw error;
    }
  }

  private static expireSession(): void {
    this.accessToken = null;
    // Dọn refresh token của phiên bản cũ còn sót trong localStorage.
    localStorage.removeItem("refresh_token");
    window.dispatchEvent(new Event("auth:logout"));
  }

  private static async createApiError(response: Response): Promise<ApiError> {
    const body = await this.readErrorResponse(response);
    return new ApiError(
      body.message || `HTTP error! status: ${response.status}`,
      response.status,
      {
        code: body.code || body.error,
        details: body.details,
        translationKey: body.translationKey,
        args: body.args,
        correlationId: response.headers.get("x-correlation-id") || undefined,
      },
    );
  }

  private static async readErrorResponse(
    response: Response,
  ): Promise<ErrorResponse> {
    try {
      const body: unknown = await response.json();
      return this.isJsonObject(body) ? (body as ErrorResponse) : {};
    } catch {
      return {};
    }
  }

  private static isJsonObject(value: unknown): value is JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  public static get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  public static post<T>(
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: "POST",
      body:
        body instanceof FormData
          ? body
          : body === undefined
            ? undefined
            : JSON.stringify(body),
    });
  }

  public static put<T>(
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: "PUT",
      body:
        body instanceof FormData
          ? body
          : body === undefined
            ? undefined
            : JSON.stringify(body),
    });
  }

  public static patch<T>(
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: "PATCH",
      body:
        body instanceof FormData
          ? body
          : body === undefined
            ? undefined
            : JSON.stringify(body),
    });
  }

  public static delete<T>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }
}
