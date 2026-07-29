import { create } from "zustand";
import { ApiClient } from "@/lib/api-client";
import { reportError } from "@/lib/observability";

import type { User } from "@repo/types";

interface LoginCredentials {
  email: string;
  password?: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
}

interface RefreshResponse {
  accessToken: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing?: boolean;
  clearAuth: () => void;
  refreshCurrentUser: () => Promise<void>;
  initialize: () => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  logoutGlobal: () => Promise<void>;
}

// Refresh token nằm trong HttpOnly cookie do server quản lý — JavaScript
// không đọc/ghi được. Store chỉ giữ access token (trong memory của
// ApiClient) và thông tin user.
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isInitializing: false,
  clearAuth: () => {
    ApiClient.setToken(null);
    // Dọn refresh token của phiên bản cũ còn sót trong localStorage.
    localStorage.removeItem("refresh_token");
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitializing: false,
    });
  },
  refreshCurrentUser: async () => {
    if (!get().isAuthenticated) return;

    try {
      const user = await ApiClient.get<User>("/users/me");
      set({ user });
    } catch (error) {
      reportError(error, {
        source: "auth",
        route: window.location.pathname,
        operation: "refresh-current-user",
      });
    }
  },
  initialize: async () => {
    if (get().isInitializing) {
      return;
    }
    set({ isInitializing: true });

    // Không thể biết cookie có tồn tại hay không (HttpOnly) — cứ thử
    // refresh; chưa từng đăng nhập thì server trả 401 và ta về trạng thái
    // chưa xác thực, không có gì để mất.
    try {
      const data = await ApiClient.post<RefreshResponse>(
        "/auth/refresh",
        {},
        { skipAuth: true },
      );

      ApiClient.setToken(data.accessToken);

      const user = await ApiClient.get<User>("/users/me");
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        isInitializing: false,
      });
    } catch {
      ApiClient.setToken(null);
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isInitializing: false,
      });
    }
  },
  login: async (credentials: LoginCredentials) => {
    const tokens = await ApiClient.post<LoginResponse>(
      "/auth/login",
      credentials,
      { skipAuth: true },
    );

    // Chỉ giữ access token trong memory; refresh token đã nằm trong
    // HttpOnly cookie mà server vừa set.
    ApiClient.setToken(tokens.accessToken);

    try {
      const user = await ApiClient.get<User>("/users/me");
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        isInitializing: false,
      });
    } catch (error) {
      // Login chỉ hoàn tất khi profile được tải thành công. Thu hồi session vừa
      // tạo để UI, access token trong memory và refresh cookie không lệch nhau.
      ApiClient.setToken(null);
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isInitializing: false,
      });
      try {
        await ApiClient.post(
          "/auth/logout",
          {},
          { skipAuth: true, skipRefresh: true },
        );
      } catch {
        // Giữ nguyên lỗi profile ban đầu; cookie hết hạn vẫn được backend kiểm
        // tra ở lần initialize tiếp theo.
      }
      throw error;
    }
  },
  logout: async () => {
    try {
      // Cookie refresh_token tự đi kèm request; server thu hồi phiên và
      // xóa cookie trong response.
      await ApiClient.post(
        "/auth/logout",
        {},
        { skipAuth: true, skipRefresh: true },
      );
    } catch {
      // Logout là best effort: session có thể đã bị server thu hồi trước
      // (force logout/deactivate). Local cleanup bên dưới vẫn phải hoàn tất.
    } finally {
      get().clearAuth();
    }
  },
  logoutGlobal: async () => {
    try {
      await ApiClient.post("/auth/logout/global");
    } catch (error) {
      reportError(error, {
        source: "auth",
        route: window.location.pathname,
        operation: "logout-global",
      });
    } finally {
      get().clearAuth();
    }
  },
}));
