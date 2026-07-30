import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth";
import { ApiClient } from "@/lib/api-client";
import { RealtimeProvider } from "./realtime-provider";

const { createRealtimeSocket, updateRealtimeToken, registerHandlers, socket } =
  vi.hoisted(() => {
    const socket = { connect: vi.fn(), disconnect: vi.fn() };
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
    vi.useFakeTimers();
    vi.clearAllMocks();
    ApiClient.setToken("access-token");
    useAuthStore.setState({ isAuthenticated: true, isLoading: false });
  });

  afterEach(() => {
    vi.useRealTimers();
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
    expect(socket.connect).not.toHaveBeenCalled();
    act(() => vi.runAllTimers());
    expect(socket.connect).toHaveBeenCalledOnce();
    expect(registerHandlers.mock.invocationCallOrder[0]).toBeLessThan(
      socket.connect.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );

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

  it("opens only the surviving StrictMode handshake", () => {
    const queryClient = new QueryClient();

    render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <RealtimeProvider>
            <p>Application</p>
          </RealtimeProvider>
        </QueryClientProvider>
      </StrictMode>,
    );

    expect(createRealtimeSocket).toHaveBeenCalledTimes(2);
    expect(socket.connect).not.toHaveBeenCalled();

    act(() => vi.runAllTimers());

    expect(socket.connect).toHaveBeenCalledOnce();
  });
});
