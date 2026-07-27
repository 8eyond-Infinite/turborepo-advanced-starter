import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardOverview } from "./DashboardOverview";

const mocks = vi.hoisted(() => ({
  useDashboardStats: vi.fn(),
  useSystemHealth: vi.fn(),
  useAuditLogs: vi.fn(),
}));

vi.mock("../hooks/useDashboardStats", () => ({
  useDashboardStats: mocks.useDashboardStats,
}));
vi.mock("../hooks/useSystemHealth", () => ({
  useSystemHealth: mocks.useSystemHealth,
}));
vi.mock("@/features/audit", () => ({
  useAuditLogs: mocks.useAuditLogs,
}));

const stats = {
  totalUsers: 12,
  activeUsers: 10,
  inactiveUsers: 2,
  activeSessionsCount: 4,
  userRegistrationTrend: [{ date: "2026-07-21", count: 2 }],
  rolesDistribution: [{ role: "USER", count: 10 }],
};

const createQueryState = () => ({
  isLoading: false,
  isError: false,
  error: null,
  isFetching: false,
  refetch: vi.fn().mockResolvedValue(undefined),
});

describe("<DashboardOverview />", () => {
  beforeEach(() => {
    mocks.useDashboardStats.mockReturnValue({
      ...createQueryState(),
      stats,
    });
    mocks.useSystemHealth.mockReturnValue({
      ...createQueryState(),
      health: {
        status: "ok",
        checks: { database: "up", redis: "up" },
      },
    });
    mocks.useAuditLogs.mockReturnValue({
      ...createQueryState(),
      logs: [],
      meta: {},
    });
  });

  it("announces the blocking dashboard loading state", () => {
    mocks.useDashboardStats.mockReturnValue({
      ...createQueryState(),
      stats: undefined,
      isLoading: true,
    });

    render(<DashboardOverview />);

    expect(
      screen.getByRole("status", {
        name: "Đang tải tổng quan hệ thống",
      }),
    ).toBeInTheDocument();
  });

  it("keeps primary stats visible when health and audit fail independently", () => {
    mocks.useSystemHealth.mockReturnValue({
      ...createQueryState(),
      health: undefined,
      isError: true,
      error: new Error("Health unavailable"),
    });
    mocks.useAuditLogs.mockReturnValue({
      ...createQueryState(),
      logs: [],
      meta: {},
      isError: true,
      error: new Error("Audit unavailable"),
    });

    render(<DashboardOverview />);

    expect(
      screen.getByRole("heading", { name: "Tổng quan hệ thống" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Unknown")).toHaveLength(2);
    expect(
      screen.getByText("Không thể tải nhật ký gần đây"),
    ).toBeInTheDocument();
  });

  it("refreshes every independent dashboard query", async () => {
    const user = userEvent.setup();
    const statsQuery = { ...createQueryState(), stats };
    const healthQuery = {
      ...createQueryState(),
      health: {
        status: "ok",
        checks: { database: "up", redis: "up" },
      },
    };
    const auditQuery = { ...createQueryState(), logs: [], meta: {} };
    mocks.useDashboardStats.mockReturnValue(statsQuery);
    mocks.useSystemHealth.mockReturnValue(healthQuery);
    mocks.useAuditLogs.mockReturnValue(auditQuery);

    render(<DashboardOverview />);
    await user.click(screen.getByRole("button", { name: "Tải lại" }));

    expect(statsQuery.refetch).toHaveBeenCalledOnce();
    expect(healthQuery.refetch).toHaveBeenCalledOnce();
    expect(auditQuery.refetch).toHaveBeenCalledOnce();
  });
});
