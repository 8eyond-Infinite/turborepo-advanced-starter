import { PERMISSIONS } from "@repo/contracts";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth";
import { SessionsManagement } from "./SessionsManagement";

const { useSessions } = vi.hoisted(() => ({ useSessions: vi.fn() }));
vi.mock("../hooks/useSessions", () => ({ useSessions }));

const setPermissions = (permissions: string[]) => {
  useAuthStore.setState({
    user: {
      id: "admin",
      email: "admin@example.com",
      username: "admin",
      isActive: true,
      isDeleted: false,
      roles: ["ADMIN"],
      permissions,
      createdAt: "2026-07-27T00:00:00.000Z",
    },
    isAuthenticated: true,
    isLoading: false,
  });
};

describe("<SessionsManagement /> permissions", () => {
  beforeEach(() => {
    useSessions.mockReturnValue({
      sessions: [
        {
          jti: "session-1",
          ip: "10.0.0.1",
          userAgent: "Mozilla/5.0 Windows Chrome",
          createdAt: "2026-07-27T00:00:00.000Z",
        },
        {
          jti: "session-2",
          ip: "10.0.0.2",
          userAgent: "Mozilla/5.0 iPhone Safari",
          createdAt: "2026-07-27T00:00:00.000Z",
        },
      ],
      meta: {
        totalItems: 2,
        itemCount: 2,
        itemsPerPage: 10,
        totalPages: 1,
        currentPage: 1,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
      revokeSession: vi.fn(),
      revokeAllSessions: vi.fn(),
      isRevokingAll: false,
    });
  });

  it("shows session data without revoke controls to a read-only principal", () => {
    setPermissions([PERMISSIONS.SESSION.READ]);
    render(<SessionsManagement />);

    expect(screen.getByText("IP: 10.0.0.1")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Đăng xuất thiết bị tại IP 10.0.0.1",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Hủy tất cả phiên khác/i }),
    ).not.toBeInTheDocument();
  });

  it("exposes individual and bulk revoke controls with delete permission", () => {
    setPermissions([PERMISSIONS.SESSION.DELETE]);
    render(<SessionsManagement />);

    expect(
      screen.getByRole("button", {
        name: "Đăng xuất thiết bị tại IP 10.0.0.1",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Hủy tất cả phiên khác/i }),
    ).toBeInTheDocument();
  });
});
