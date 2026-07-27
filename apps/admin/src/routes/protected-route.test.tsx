import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth";
import { ProtectedRoute } from "./protected-route";

const { useWebSocket } = vi.hoisted(() => ({
  useWebSocket: vi.fn(),
}));
vi.mock("@/hooks/useWebSocket", () => ({ useWebSocket }));

const renderRoute = () =>
  render(
    <MemoryRouter initialEntries={["/private"]}>
      <Routes>
        <Route path="/login" element={<p>Login page</p>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/private" element={<p>Private page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe("<ProtectedRoute />", () => {
  beforeEach(() => {
    useWebSocket.mockClear();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitializing: false,
    });
  });

  it("keeps navigation pending while the session is being restored", () => {
    useAuthStore.setState({ isLoading: true });

    renderRoute();

    expect(
      screen.getByRole("status", {
        name: "Đang khôi phục phiên đăng nhập",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Login page")).not.toBeInTheDocument();
  });

  it("redirects an unauthenticated visitor to login", () => {
    renderRoute();

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("renders the protected outlet for an authenticated user", () => {
    useAuthStore.setState({ isAuthenticated: true });

    renderRoute();

    expect(screen.getByText("Private page")).toBeInTheDocument();
  });
});
