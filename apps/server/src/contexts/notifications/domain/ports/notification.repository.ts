import { NotificationEntity } from '../notification.entity';

export interface NotificationRepository {
    save(notification: NotificationEntity): Promise<void>;
    findById(id: string): Promise<NotificationEntity | null>;
    findByUserId(
        userId: string,
        options: { page: number; limit: number }
    ): Promise<{ items: NotificationEntity[]; total: number }>;
    markAllAsRead(userId: string): Promise<void>;
}
