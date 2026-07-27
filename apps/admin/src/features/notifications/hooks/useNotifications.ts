import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getFriendlyErrorMessage } from "@/lib/error-handler";
import { notificationApi } from "../api/notification.api";
import { notificationKeys } from "../api/notification.keys";

export const useNotifications = () => {
  const queryClient = useQueryClient();

  // Fetch user's notifications
  const notificationsQuery = useQuery({
    queryKey: notificationKeys.list(1, 50),
    queryFn: () => notificationApi.getNotifications(1, 50),
    staleTime: 30000,
  });

  const notifications = notificationsQuery.data?.items || [];
  const total = notificationsQuery.data?.total || 0;
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Mutation to mark a notification as read
  const markAsReadMutation = useMutation({
    mutationFn: notificationApi.markAsRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error: unknown) => {
      toast.error(
        `Không thể cập nhật trạng thái thông báo: ${getFriendlyErrorMessage(error)}`,
      );
    },
  });

  // Mutation to mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: notificationApi.markAllAsRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      toast.success("Đã đánh dấu đọc tất cả thông báo!");
    },
    onError: (error: unknown) => {
      toast.error(
        `Không thể cập nhật thông báo: ${getFriendlyErrorMessage(error)}`,
      );
    },
  });

  return {
    notifications,
    total,
    unreadCount,
    isLoading: notificationsQuery.isLoading,
    isError: notificationsQuery.isError,
    error: notificationsQuery.error,
    isFetching: notificationsQuery.isFetching,
    refetch: notificationsQuery.refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
  };
};
