import { ApiClient, ApiError } from "@/lib/api-client";

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  activeSessionsCount: number;
  rolesDistribution: { role: string; count: number }[];
  userRegistrationTrend: { date: string; count: number }[];
}

export interface SystemHealth {
  status: "ok" | "error";
  checks: {
    database: "up" | "down";
    redis: "up" | "down";
  };
}

const getHealth = async (): Promise<SystemHealth> => {
  try {
    return await ApiClient.get<SystemHealth>("/health/ready", {
      skipAuth: true,
      skipRefresh: true,
    });
  } catch (error) {
    // 503 nghĩa là ít nhất một hạ tầng down; body lỗi không đi qua ApiError
    // nên hiển thị bảo thủ: coi cả hai là down để buộc người vận hành kiểm tra.
    if (error instanceof ApiError) {
      return { status: "error", checks: { database: "down", redis: "down" } };
    }
    throw error;
  }
};

export const dashboardApi = {
  getStats: () => ApiClient.get<DashboardStats>("/dashboard/stats"),
  getHealth,
};
