import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '@/lib/api-client';
import { toast } from 'sonner';

import type { ActiveSession, PaginatedResult } from '@repo/types';

export const useSessions = (options?: { page?: number; limit?: number }) => {
    const queryClient = useQueryClient();
    const page = options?.page || 1;
    const limit = options?.limit || 10;

    // 1. Fetch active sessions query
    const { data, isLoading } = useQuery<PaginatedResult<ActiveSession>>({
        queryKey: ['active-sessions', page, limit],
        queryFn: async () => {
            const queryParams = new URLSearchParams();
            queryParams.append('page', page.toString());
            queryParams.append('limit', limit.toString());
            return await ApiClient.get<PaginatedResult<ActiveSession>>(`/auth/sessions?${queryParams.toString()}`);
        },
        staleTime: 30000,
    });

    const sessions = data?.data || [];
    const meta = data?.meta || { totalItems: 0, itemCount: 0, itemsPerPage: limit, totalPages: 1, currentPage: page };

    // 2. Revoke a session mutation
    const revokeSessionMutation = useMutation({
        mutationFn: async (jti: string) => {
            return await ApiClient.delete(`/auth/sessions/${jti}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
            toast.success("Đã thu hồi phiên đăng nhập thành công!");
        },
        onError: (err: any) => {
            toast.error("Không thể thu hồi phiên đăng nhập: " + err.message);
        }
    });

    // 3. Global logout mutation (logout all other sessions)
    const revokeAllSessionsMutation = useMutation({
        mutationFn: async () => {
            return await ApiClient.post('/auth/logout/global');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
            toast.success("Đã thu hồi toàn bộ các phiên đăng nhập khác!");
        },
        onError: (err: any) => {
            toast.error("Không thể thu hồi các phiên đăng nhập: " + err.message);
        }
    });

    return {
        sessions,
        meta,
        isLoading,
        revokeSession: revokeSessionMutation.mutate,
        revokeAllSessions: revokeAllSessionsMutation.mutate,
        isRevoking: revokeSessionMutation.isPending,
        isRevokingAll: revokeAllSessionsMutation.isPending,
    };
};
