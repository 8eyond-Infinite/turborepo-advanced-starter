import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../api/dashboard.api";
import { dashboardKeys } from "../api/dashboard.keys";

export const useSystemHealth = () => {
  const query = useQuery({
    queryKey: dashboardKeys.health(),
    queryFn: dashboardApi.getHealth,
    // Trạng thái hạ tầng cần tươi: tự làm mới mỗi 30 giây.
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  return {
    health: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
};
