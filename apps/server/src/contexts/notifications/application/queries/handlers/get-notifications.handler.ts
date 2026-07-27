import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { GetNotificationsQuery } from '../get-notifications.query';
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from '../../../domain/ports/notification.repository';
import { Result } from '@shared/domain/result';

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: string;
  isRead: boolean;
  createdAt: Date;
}

export interface NotificationPage {
  items: NotificationItem[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
}

@QueryHandler(GetNotificationsQuery)
export class GetNotificationsHandler implements IQueryHandler<
  GetNotificationsQuery,
  Result<NotificationPage, Error>
> {
  private readonly logger = new Logger(GetNotificationsHandler.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(
    query: GetNotificationsQuery,
  ): Promise<Result<NotificationPage, Error>> {
    const { userId, page, limit } = query;
    this.logger.log(
      `Fetching notifications for user ${userId} - Page: ${page}, Limit: ${limit}`,
    );

    try {
      const { items, total, unreadCount } =
        await this.notificationRepository.findByUserId(userId, {
          page,
          limit,
        });

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
        unreadCount,
        page,
        limit,
      });
    } catch (error: unknown) {
      const cause =
        error instanceof Error
          ? error
          : new Error('Failed to fetch notifications');
      this.logger.error(`Failed to fetch notifications: ${cause.message}`);
      return Result.fail(cause);
    }
  }
}
