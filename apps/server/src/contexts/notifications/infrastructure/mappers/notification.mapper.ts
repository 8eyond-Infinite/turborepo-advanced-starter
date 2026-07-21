import { Notification as PrismaNotification } from '@repo/database';
import { NotificationEntity } from '../../domain/notification.entity';

export class NotificationMapper {
    public static toDomain(raw: PrismaNotification): NotificationEntity {
        return NotificationEntity.create({
            id: raw.id,
            userId: raw.userId,
            title: raw.title,
            content: raw.content,
            type: raw.type,
            isRead: raw.isRead,
            createdAt: raw.createdAt,
        });
    }

    public static toPersistence(entity: NotificationEntity): PrismaNotification {
        return {
            id: entity.id,
            userId: entity.userId,
            title: entity.title,
            content: entity.content,
            type: entity.type,
            isRead: entity.isRead,
            createdAt: entity.createdAt,
        };
    }
}
