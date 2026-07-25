import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../api/dashboard.api";
import { dashboardKeys } from "../api/dashboard.keys";

export const useDashboardStats = () => {
  const query = useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: dashboardApi.getStats,
    staleTime: 30000,
  });

  return {
    stats: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
};
