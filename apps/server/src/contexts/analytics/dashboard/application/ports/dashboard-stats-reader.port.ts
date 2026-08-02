export const DASHBOARD_STATS_READER = Symbol('DASHBOARD_STATS_READER');

export interface DashboardDatabaseStats {
  totalUsers: number;
  activeUsers: number;
  rolesDistribution: Array<{ role: string; count: number }>;
  userRegistrationTrend: Array<{ date: string; count: number }>;
}

export interface DashboardStatsReader {
  read(): Promise<DashboardDatabaseStats>;
}
