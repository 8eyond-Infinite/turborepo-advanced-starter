import { QueryClient } from "@tanstack/react-query";
import type { Socket } from "socket.io-client";
import { describe, expect, it, vi } from "vitest";
import { registerRealtimeEventHandlers } from "./realtime-event-handlers";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
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
    handlers.get("notification_received")?.({
      id: "notification-1",
      title: "Title",
      content: "Content",
    } as never);
    handlers.get("force_logout")?.({ message: "Revoked" } as never);

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["notifications"],
    });
    expect(logout).toHaveBeenCalledOnce();

    unregister();
    expect(socket.off).toHaveBeenCalledTimes(3);
  });
});
