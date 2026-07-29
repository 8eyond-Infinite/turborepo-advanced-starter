import type { ReactNode } from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth";
import App from "./App";

const { navigate, subscribeToAuthCacheCleanup, unsubscribeFromCacheCleanup } =
  vi.hoisted(() => {
    const unsubscribe = vi.fn();
    return {
      navigate: vi.fn(),
      unsubscribeFromCacheCleanup: unsubscribe,
      subscribeToAuthCacheCleanup: vi.fn(() => unsubscribe),
    };
  });

vi.mock("@/routes", () => ({
  router: { navigate },
}));

vi.mock("@/app/auth-cache-boundary", () => ({
  subscribeToAuthCacheCleanup,
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const original = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...original,
    RouterProvider: () => <div>Admin router</div>,
  };
});

vi.mock("@/app/realtime/realtime-provider", () => ({
  RealtimeProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("./components/theme-provider", () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/components/application-error-boundary", () => ({
  ApplicationErrorBoundary: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/components/ui/sonner", () => ({
  Toaster: () => <div>Notification toaster</div>,
}));

describe("<App /> lifecycle", () => {
  const initialize = vi.fn(async () => undefined);
  const clearAuth = vi.fn();
  const refreshCurrentUser = vi.fn(async () => undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitializing: false,
      initialize,
      clearAuth,
      refreshCurrentUser,
    });
  });

  afterEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitializing: false,
    });
  });

  it("initializes auth and mounts application-wide boundaries", () => {
    render(<App />);

    expect(initialize).toHaveBeenCalledOnce();
    expect(subscribeToAuthCacheCleanup).toHaveBeenCalledOnce();
    expect(screen.getByText("Admin router")).toBeInTheDocument();
    expect(screen.getByText("Notification toaster")).toBeInTheDocument();
  });

  it("keeps routes hidden while the previous session is being restored", () => {
    useAuthStore.setState({ isLoading: true });

    render(<App />);

    expect(
      screen.getByRole("status", {
        name: "Đang khôi phục phiên đăng nhập…",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Admin router")).not.toBeInTheDocument();
  });

  it("clears local auth and navigates to login after a global logout event", () => {
    render(<App />);

    act(() => {
      window.dispatchEvent(new Event("auth:logout"));
    });

    expect(clearAuth).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith("/login");
  });

  it("refreshes the current authorization snapshot after token rotation", () => {
    render(<App />);

    act(() => {
      window.dispatchEvent(new Event("auth:token-refreshed"));
    });

    expect(refreshCurrentUser).toHaveBeenCalledOnce();
  });

  it("removes global subscriptions when the application unmounts", () => {
    const { unmount } = render(<App />);

    unmount();

    expect(unsubscribeFromCacheCleanup).toHaveBeenCalledOnce();

    window.dispatchEvent(new Event("auth:logout"));
    window.dispatchEvent(new Event("auth:token-refreshed"));
    expect(clearAuth).not.toHaveBeenCalled();
    expect(refreshCurrentUser).not.toHaveBeenCalled();
  });
});
