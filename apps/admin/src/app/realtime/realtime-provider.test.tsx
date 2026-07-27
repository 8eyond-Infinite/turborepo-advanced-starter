import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth";
import { ApiClient } from "@/lib/api-client";
import { RealtimeProvider } from "./realtime-provider";

const { createRealtimeSocket, updateRealtimeToken, registerHandlers, socket } =
  vi.hoisted(() => {
    const socket = { disconnect: vi.fn() };
    return {
      socket,
      createRealtimeSocket: vi.fn(() => socket),
      updateRealtimeToken: vi.fn(),
      registerHandlers: vi.fn(() => vi.fn()),
    };
  });

vi.mock("./realtime-client", () => ({
  createRealtimeSocket,
  updateRealtimeToken,
}));
vi.mock("./realtime-event-handlers", () => ({
  registerRealtimeEventHandlers: registerHandlers,
}));

describe("<RealtimeProvider />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ApiClient.setToken("access-token");
    useAuthStore.setState({ isAuthenticated: true, isLoading: false });
  });

  it("owns connection, token rotation, and cleanup lifecycle", () => {
    const queryClient = new QueryClient();
    const unregister = vi.fn();
    registerHandlers.mockReturnValue(unregister);

    const view = render(
      <QueryClientProvider client={queryClient}>
        <RealtimeProvider>
          <p>Application</p>
        </RealtimeProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText("Application")).toBeInTheDocument();
    expect(createRealtimeSocket).toHaveBeenCalledWith("access-token");

    act(() => {
      window.dispatchEvent(
        new CustomEvent("auth:token-refreshed", {
          detail: "rotated-token",
        }),
      );
    });
    expect(updateRealtimeToken).toHaveBeenCalledWith(socket, "rotated-token");

    view.unmount();
    expect(unregister).toHaveBeenCalledOnce();
    expect(socket.disconnect).toHaveBeenCalledOnce();
  });
});
