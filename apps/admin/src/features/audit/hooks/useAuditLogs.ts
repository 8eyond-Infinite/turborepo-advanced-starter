import { useQuery } from "@tanstack/react-query";
import { auditApi } from "../api/audit.api";
import { auditKeys } from "../api/audit.keys";

export const useAuditLogs = (options?: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  const params = {
    page: options?.page || 1,
    limit: options?.limit || 10,
    search: options?.search || "",
  };

  const auditLogsQuery = useQuery({
    queryKey: auditKeys.list(params),
    queryFn: () => auditApi.getAuditLogs(params),
    staleTime: 10000, // Audit logs update frequently, keep staleTime relatively low
  });

  const logs = auditLogsQuery.data?.data || [];
  const meta = auditLogsQuery.data?.meta || {
    totalItems: 0,
    itemCount: 0,
    itemsPerPage: params.limit,
    totalPages: 1,
    currentPage: params.page,
  };

  return {
    logs,
    meta,
    isLoading: auditLogsQuery.isLoading,
    isError: auditLogsQuery.isError,
    error: auditLogsQuery.error,
    isFetching: auditLogsQuery.isFetching,
    refetch: auditLogsQuery.refetch,
  };
};
