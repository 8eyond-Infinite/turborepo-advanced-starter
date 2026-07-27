import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth";
import { ApiClient } from "@/lib/api-client";
import { useWebSocket } from "./useWebSocket";

const { io, socket, handlers } = vi.hoisted(() => {
  const handlers = new Map<string, (payload?: unknown) => void>();
  const socket = {
    auth: {},
    on: vi.fn((event: string, handler: (payload?: unknown) => void) => {
      handlers.set(event, handler);
    }),
    disconnect: vi.fn(),
  };
  return {
    io: vi.fn((...args: [string, Record<string, unknown>]) => {
      void args;
      return socket;
    }),
    socket,
    handlers,
  };
});

vi.mock("socket.io-client", () => ({ io }));
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

describe("useWebSocket", () => {
  let queryClient: QueryClient;
  const logout = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    handlers.clear();
    queryClient = new QueryClient();
    ApiClient.setToken("initial-access-token");
    useAuthStore.setState({
      isAuthenticated: true,
      isLoading: false,
      logout,
    });
  });

  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("sends credentials only through the Socket.IO auth payload", () => {
    renderHook(() => useWebSocket(), { wrapper });

    expect(io).toHaveBeenCalledWith(
      "http://localhost:3001",
      expect.objectContaining({
        auth: { token: "initial-access-token" },
      }),
    );
    expect(io.mock.calls[0]?.[1]).not.toHaveProperty("query");
  });

  it("updates the credential used by the next reconnect after HTTP refresh", () => {
    renderHook(() => useWebSocket(), { wrapper });

    act(() => {
      window.dispatchEvent(
        new CustomEvent("auth:token-refreshed", {
          detail: "rotated-access-token",
        }),
      );
    });

    expect(socket.auth).toEqual({ token: "rotated-access-token" });
  });

  it("invalidates notification state and handles forced logout events", () => {
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    renderHook(() => useWebSocket(), { wrapper });

    act(() => {
      handlers.get("notification_received")?.({
        id: "notification-1",
        title: "Title",
        content: "Content",
      });
      handlers.get("force_logout")?.({ message: "Session revoked" });
    });

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["notifications"],
    });
    expect(logout).toHaveBeenCalledOnce();
  });
});
