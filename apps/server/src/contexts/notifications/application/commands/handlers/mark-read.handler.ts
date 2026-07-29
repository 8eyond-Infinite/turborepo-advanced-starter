import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { MarkNotificationReadCommand } from '../mark-read.command';
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from '../../../domain/ports/notification.repository';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { NotificationNotFoundException } from '../../../domain/exceptions/notification-not-found.exception';
import { NotificationForbiddenException } from '../../../domain/exceptions/notification-forbidden.exception';

@CommandHandler(MarkNotificationReadCommand)
export class MarkNotificationReadHandler implements ICommandHandler<MarkNotificationReadCommand> {
  private readonly logger = new Logger(MarkNotificationReadHandler.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(
    command: MarkNotificationReadCommand,
  ): Promise<Result<void, Error | DomainException>> {
    const { userId, notificationId, all } = command;

    try {
      if (all) {
        this.logger.log(`Marking all notifications as read for user ${userId}`);
        await this.notificationRepository.markAllAsRead(userId);
      } else if (notificationId) {
        this.logger.log(
          `Marking notification ${notificationId} as read for user ${userId}`,
        );
        const notification =
          await this.notificationRepository.findById(notificationId);

        if (!notification) {
          return Result.fail(new NotificationNotFoundException(notificationId));
        }

        if (notification.userId !== userId) {
          return Result.fail(
            new NotificationForbiddenException(notificationId),
          );
        }

        notification.markAsRead();
        await this.notificationRepository.save(notification);
      }

      return Result.ok(undefined);
    } catch (error: unknown) {
      const cause =
        error instanceof Error
          ? error
          : new Error('Failed to mark notification(s) as read');
      this.logger.error(
        `Failed to mark notification(s) as read: ${cause.message}`,
      );
      return Result.fail(cause);
    }
  }
}
