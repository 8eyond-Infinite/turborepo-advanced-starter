import type { Notification } from "@repo/types";
import { ApiClient } from "@/lib/api-client";

export interface NotificationListResponse {
  items: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
}

export const notificationApi = {
  getNotifications: (page: number, limit: number) =>
    ApiClient.get<NotificationListResponse>(
      `/notifications?page=${page}&limit=${limit}`,
    ),
  markAsRead: (id: string) =>
    ApiClient.patch<void>(`/notifications/${id}/read`, {}),
  markAllAsRead: () => ApiClient.post<void>("/notifications/read-all", {}),
};
