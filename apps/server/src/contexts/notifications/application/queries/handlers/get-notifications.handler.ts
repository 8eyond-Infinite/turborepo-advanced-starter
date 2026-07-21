import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { GetNotificationsQuery } from '../get-notifications.query';
import type { NotificationRepository } from '../../../domain/ports/notification.repository';
import { Result } from '@shared/domain/result';

@QueryHandler(GetNotificationsQuery)
export class GetNotificationsHandler implements IQueryHandler<GetNotificationsQuery> {
    private readonly logger = new Logger(GetNotificationsHandler.name);

    constructor(
        @Inject('NotificationRepository')
        private readonly notificationRepository: NotificationRepository,
    ) {}

    async execute(query: GetNotificationsQuery): Promise<Result<{ items: any[]; total: number; page: number; limit: number }, Error>> {
        const { userId, page, limit } = query;
        this.logger.log(`Fetching notifications for user ${userId} - Page: ${page}, Limit: ${limit}`);

        try {
            const { items, total } = await this.notificationRepository.findByUserId(userId, { page, limit });

            const formattedItems = items.map((n) => ({
                id: n.id,
                userId: n.userId,
                title: n.title,
                content: n.content,
                type: n.type,
                isRead: n.isRead,
                createdAt: n.createdAt,
            }));

            return Result.ok({
                items: formattedItems,
                total,
                page,
                limit,
            });
        } catch (error: any) {
            this.logger.error(`Failed to fetch notifications: ${error.message}`);
            return Result.fail(error);
        }
    }
}
