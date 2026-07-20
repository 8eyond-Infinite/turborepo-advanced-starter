import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '@/lib/api-client';

export interface DashboardStats {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    activeSessionsCount: number;
    rolesDistribution: { role: string; count: number }[];
    userRegistrationTrend: { date: string; count: number }[];
}

export const useDashboardStats = () => {
    const { data, isLoading, refetch, isFetching } = useQuery<DashboardStats>({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            return await ApiClient.get<DashboardStats>('/dashboard/stats');
        },
        staleTime: 30000,
    });

    return {
        stats: data,
        isLoading,
        isFetching,
        refetch,
    };
};
