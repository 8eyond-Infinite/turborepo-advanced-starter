import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DashboardStats } from "../api/dashboard.api";
import { DashboardCharts } from "./DashboardCharts";

const stats: DashboardStats = {
  totalUsers: 12,
  activeUsers: 10,
  inactiveUsers: 2,
  activeSessionsCount: 4,
  userRegistrationTrend: [
    { date: "2026-07-21", count: 1 },
    { date: "2026-07-22", count: 3 },
    { date: "2026-07-23", count: 2 },
  ],
  rolesDistribution: [
    { role: "ADMIN", count: 2 },
    { role: "USER", count: 8 },
  ],
};

describe("<DashboardCharts />", () => {
  it("exposes chart meaning and exact values without requiring visual parsing", () => {
    render(<DashboardCharts stats={stats} />);

    expect(
      screen.getByRole("img", {
        name: "Biểu đồ đăng ký mới trong 7 ngày, cao nhất 3 tài khoản một ngày",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("21/07")).toBeInTheDocument();
    expect(
      screen.getByRole("meter", { name: "Vai trò ADMIN" }),
    ).toHaveAttribute("aria-valuetext", "2 lượt gán, 20%");
    expect(screen.getByRole("meter", { name: "Vai trò USER" })).toHaveAttribute(
      "aria-valuetext",
      "8 lượt gán, 80%",
    );
  });

  it("renders explicit empty states for zero-value datasets", () => {
    render(
      <DashboardCharts
        stats={{
          ...stats,
          userRegistrationTrend: [
            { date: "2026-07-21", count: 0 },
            { date: "2026-07-22", count: 0 },
          ],
          rolesDistribution: [{ role: "USER", count: 0 }],
        }}
      />,
    );

    expect(
      screen.getByText("Chưa có tài khoản đăng ký trong khoảng thời gian này."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Chưa có dữ liệu phân bổ vai trò."),
    ).toBeInTheDocument();
  });
});
