import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import type { Notification } from '@repo/types';

interface GetNotificationsResponse {
    items: Notification[];
    total: number;
    page: number;
    limit: number;
}

export const useNotifications = () => {
    const queryClient = useQueryClient();

    // Fetch user's notifications
    const { data, isLoading } = useQuery<GetNotificationsResponse>({
        queryKey: ['notifications'],
        queryFn: async () => {
            return await ApiClient.get<GetNotificationsResponse>('/notifications?page=1&limit=50');
        },
        staleTime: 30000,
    });

    const notifications = data?.items || [];
    const total = data?.total || 0;
    const unreadCount = notifications.filter(n => !n.isRead).length;

    // Mutation to mark a notification as read
    const markAsReadMutation = useMutation({
        mutationFn: async (id: string) => {
            return await ApiClient.patch(`/notifications/${id}/read`, {});
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
        onError: (err: any) => {
            toast.error(`Không thể cập nhật trạng thái thông báo: ${err.message}`);
        }
    });

    // Mutation to mark all as read
    const markAllAsReadMutation = useMutation({
        mutationFn: async () => {
            return await ApiClient.post('/notifications/read-all', {});
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast.success('Đã đánh dấu đọc tất cả thông báo!');
        },
        onError: (err: any) => {
            toast.error(`Không thể cập nhật thông báo: ${err.message}`);
        }
    });

    return {
        notifications,
        total,
        unreadCount,
        isLoading,
        markAsRead: markAsReadMutation.mutate,
        markAllAsRead: markAllAsReadMutation.mutate,
    };
};
