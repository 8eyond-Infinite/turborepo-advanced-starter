import { NotificationEntity } from '../notification.entity';

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');

export interface NotificationRepository {
  save(notification: NotificationEntity): Promise<void>;
  findById(id: string): Promise<NotificationEntity | null>;
  findByUserId(
    userId: string,
    options: { page: number; limit: number },
  ): Promise<{
    items: NotificationEntity[];
    total: number;
    unreadCount: number;
  }>;
  markAllAsRead(userId: string): Promise<void>;
}
