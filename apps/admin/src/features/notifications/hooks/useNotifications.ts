import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getFriendlyErrorMessage } from "@/lib/error-handler";
import { notificationApi } from "../api/notification.api";
import type { NotificationListResponse } from "../api/notification.api";
import { notificationKeys } from "../api/notification.keys";

export const useNotifications = () => {
  const queryClient = useQueryClient();
  const listKey = notificationKeys.list(1, 50);

  // Fetch user's notifications
  const notificationsQuery = useQuery({
    queryKey: listKey,
    queryFn: () => notificationApi.getNotifications(1, 50),
    staleTime: 30000,
  });

  const notifications = notificationsQuery.data?.items || [];
  const total = notificationsQuery.data?.total || 0;
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;

  // Mutation to mark a notification as read
  const markAsReadMutation = useMutation({
    mutationFn: notificationApi.markAsRead,
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const previous =
        queryClient.getQueryData<NotificationListResponse>(listKey);
      queryClient.setQueryData<NotificationListResponse>(listKey, (current) => {
        if (!current) return current;
        const target = current.items.find((item) => item.id === notificationId);
        if (!target || target.isRead) return current;
        return {
          ...current,
          unreadCount: Math.max(0, current.unreadCount - 1),
          items: current.items.map((item) =>
            item.id === notificationId ? { ...item, isRead: true } : item,
          ),
        };
      });
      return { previous };
    },
    onError: (error: unknown, _notificationId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listKey, context.previous);
      }
      toast.error(
        `Không thể cập nhật trạng thái thông báo: ${getFriendlyErrorMessage(error)}`,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  // Mutation to mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: notificationApi.markAllAsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const previous =
        queryClient.getQueryData<NotificationListResponse>(listKey);
      queryClient.setQueryData<NotificationListResponse>(listKey, (current) =>
        current
          ? {
              ...current,
              unreadCount: 0,
              items: current.items.map((item) => ({
                ...item,
                isRead: true,
              })),
            }
          : current,
      );
      return { previous };
    },
    onError: (error: unknown, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listKey, context.previous);
      }
      toast.error(
        `Không thể cập nhật thông báo: ${getFriendlyErrorMessage(error)}`,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      toast.success("Đã đánh dấu đọc tất cả thông báo!");
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
    markAsRead: markAsReadMutation.mutateAsync,
    markAllAsRead: markAllAsReadMutation.mutateAsync,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    isMarkingNotification: markAsReadMutation.isPending,
    markingNotificationId: markAsReadMutation.variables ?? null,
  };
};
