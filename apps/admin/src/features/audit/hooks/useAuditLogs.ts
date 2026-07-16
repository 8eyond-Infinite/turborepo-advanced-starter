import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '@/lib/api-client';
import type { AuditLog, PaginatedResult } from '@repo/types';

export const useAuditLogs = (options?: { page?: number; limit?: number; search?: string }) => {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const search = options?.search || '';

    const { data, isLoading, refetch, isFetching } = useQuery<PaginatedResult<AuditLog>>({
        queryKey: ['audit-logs', page, limit, search],
        queryFn: async () => {
            const queryParams = new URLSearchParams();
            queryParams.append('page', page.toString());
            queryParams.append('limit', limit.toString());
            if (search) {
                queryParams.append('search', search);
            }
            return await ApiClient.get<PaginatedResult<AuditLog>>(`/audit-logs?${queryParams.toString()}`);
        },
        staleTime: 10000, // Audit logs update frequently, keep staleTime relatively low
    });

    const logs = data?.data || [];
    const meta = data?.meta || { totalItems: 0, itemCount: 0, itemsPerPage: limit, totalPages: 1, currentPage: page };

    return {
        logs,
        meta,
        isLoading,
        isFetching,
        refetch,
    };
};
