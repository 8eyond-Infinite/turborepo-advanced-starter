import { QueryClient } from "@tanstack/react-query";
import type { Socket } from "socket.io-client";
import { describe, expect, it, vi } from "vitest";
import { registerRealtimeEventHandlers } from "./realtime-event-handlers";
import { reportError } from "@/lib/observability";
import { REALTIME_AUTH_ERROR_CODE, REALTIME_EVENTS } from "@repo/contracts";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));
vi.mock("@/lib/observability", () => ({
  reportError: vi.fn(),
}));

describe("realtime event handlers", () => {
  it("handles domain events and unregisters every listener", () => {
    const handlers = new Map<string, (payload: never) => void>();
    const socket = {
      on: vi.fn((event: string, handler: (payload: never) => void) => {
        handlers.set(event, handler);
      }),
      off: vi.fn(),
    } as unknown as Socket;
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const logout = vi.fn().mockResolvedValue(undefined);

    const unregister = registerRealtimeEventHandlers({
      socket,
      queryClient,
      logout,
    });
    handlers.get(REALTIME_EVENTS.NOTIFICATION_RECEIVED)?.({
      id: "notification-1",
      title: "Title",
      content: "Content",
    } as never);
    handlers.get(REALTIME_EVENTS.FORCE_LOGOUT)?.({
      message: "Revoked",
    } as never);

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["notifications"],
    });
    expect(logout).toHaveBeenCalledOnce();

    unregister();
    expect(socket.off).toHaveBeenCalledTimes(4);
  });

  it("logs out only for an explicit authentication handshake failure", () => {
    const handlers = new Map<string, (payload: never) => void>();
    const socket = {
      on: vi.fn((event: string, handler: (payload: never) => void) => {
        handlers.set(event, handler);
      }),
      off: vi.fn(),
    } as unknown as Socket;
    const logout = vi.fn().mockResolvedValue(undefined);

    registerRealtimeEventHandlers({
      socket,
      queryClient: new QueryClient(),
      logout,
    });
    handlers.get("connect_error")?.({
      message: "Authentication failed",
      data: { code: REALTIME_AUTH_ERROR_CODE },
    } as never);

    expect(logout).toHaveBeenCalledOnce();
    expect(reportError).not.toHaveBeenCalled();
  });

  it("reports transient connection errors without destroying the session", () => {
    const handlers = new Map<string, (payload: never) => void>();
    const socket = {
      on: vi.fn((event: string, handler: (payload: never) => void) => {
        handlers.set(event, handler);
      }),
      off: vi.fn(),
    } as unknown as Socket;
    const logout = vi.fn().mockResolvedValue(undefined);
    const error = new Error("network unavailable");

    registerRealtimeEventHandlers({
      socket,
      queryClient: new QueryClient(),
      logout,
    });
    handlers.get("connect_error")?.(error as never);

    expect(logout).not.toHaveBeenCalled();
    expect(reportError).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        source: "realtime",
        operation: "connect",
      }),
    );
  });
});
