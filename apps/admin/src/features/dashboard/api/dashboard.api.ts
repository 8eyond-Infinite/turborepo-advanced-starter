import { ApiClient } from "@/lib/api-client";

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  activeSessionsCount: number;
  rolesDistribution: { role: string; count: number }[];
  userRegistrationTrend: { date: string; count: number }[];
}

export const dashboardApi = {
  getStats: () => ApiClient.get<DashboardStats>("/dashboard/stats"),
};
