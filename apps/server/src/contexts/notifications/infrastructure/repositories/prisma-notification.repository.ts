import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { NotificationRepository } from '../../domain/ports/notification.repository';
import { NotificationEntity } from '../../domain/notification.entity';
import { NotificationMapper } from '../mappers/notification.mapper';
import { DomainEventDispatcher } from '@infrastructure/event-bus/domain-event-dispatcher';

@Injectable()
export class PrismaNotificationRepository implements NotificationRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly domainEventDispatcher: DomainEventDispatcher,
    ) {}

    async save(notification: NotificationEntity): Promise<void> {
        const raw = NotificationMapper.toPersistence(notification);

        await this.prisma.notification.upsert({
            where: { id: raw.id },
            update: {
                isRead: raw.isRead,
            },
            create: {
                id: raw.id,
                userId: raw.userId,
                title: raw.title,
                content: raw.content,
                type: raw.type,
                isRead: raw.isRead,
                createdAt: raw.createdAt,
            },
        });

        // Dispatch domain events (NotificationCreatedEvent, etc.)
        await this.domainEventDispatcher.dispatch(notification);
    }

    async findById(id: string): Promise<NotificationEntity | null> {
        const raw = await this.prisma.notification.findUnique({
            where: { id },
        });

        return raw ? NotificationMapper.toDomain(raw) : null;
    }

    async findByUserId(
        userId: string,
        options: { page: number; limit: number }
    ): Promise<{ items: NotificationEntity[]; total: number }> {
        const { page, limit } = options;
        const skip = (page - 1) * limit;

        const [raws, total] = await Promise.all([
            this.prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.notification.count({
                where: { userId },
            }),
        ]);

        return {
            items: raws.map((raw) => NotificationMapper.toDomain(raw)),
            total,
        };
    }

    async markAllAsRead(userId: string): Promise<void> {
        await this.prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
    }
}
