import { PERMISSIONS } from "@repo/contracts";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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

const renderSessions = (initialEntry = "/sessions") =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <SessionsManagement />
    </MemoryRouter>,
  );

describe("<SessionsManagement /> permissions", () => {
  beforeEach(() => {
    useSessions.mockReturnValue({
      sessions: [
        {
          jti: "session-1",
          ip: "10.0.0.1",
          userAgent: "Mozilla/5.0 Windows Chrome",
          createdAt: "2026-07-27T00:00:00.000Z",
          absoluteExpiresAt: "2026-08-03T00:00:00.000Z",
          isCurrent: true,
        },
        {
          jti: "session-2",
          ip: "10.0.0.2",
          userAgent: "Mozilla/5.0 iPhone Safari",
          createdAt: "2026-07-27T00:00:00.000Z",
        },
        {
          jti: "session-3",
          ip: "10.0.0.3",
          userAgent: "Mozilla/5.0 Linux Android Chrome",
          createdAt: "2026-07-27T00:00:00.000Z",
        },
        {
          jti: "session-4",
          ip: "10.0.0.4",
          userAgent: "Mozilla/5.0 Windows Chrome Edg/126",
          createdAt: "2026-07-27T00:00:00.000Z",
        },
      ],
      meta: {
        totalItems: 4,
        itemCount: 4,
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
      isRevoking: false,
      revokingSessionId: null,
    });
  });

  it("shows session data without revoke controls to a read-only principal", () => {
    setPermissions([PERMISSIONS.SESSION.READ]);
    renderSessions();

    expect(screen.getByText("IP: 10.0.0.1")).toBeInTheDocument();
    expect(screen.getByText(/Hết hạn:/i)).toBeInTheDocument();
    expect(screen.getByText("Android • Google Chrome")).toBeInTheDocument();
    expect(screen.getByText("Windows • Microsoft Edge")).toBeInTheDocument();
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
    renderSessions();

    expect(
      screen.getByRole("button", {
        name: "Đăng xuất thiết bị tại IP 10.0.0.2",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Đăng xuất thiết bị tại IP 10.0.0.1",
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Phiên hiện tại")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Hủy tất cả phiên khác/i }),
    ).toBeInTheDocument();
  });

  it("reads pagination from the URL", () => {
    setPermissions([PERMISSIONS.SESSION.READ]);
    renderSessions("/sessions?page=3");

    expect(useSessions).toHaveBeenCalledWith({ page: 3, limit: 10 });
  });
});
