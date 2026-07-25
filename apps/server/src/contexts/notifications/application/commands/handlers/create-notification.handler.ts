import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { CreateNotificationCommand } from '../create-notification.command';
import { NotificationEntity } from '../../../domain/notification.entity';
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from '../../../domain/ports/notification.repository';
import { Result } from '@shared/domain/result';
import * as crypto from 'crypto';

@CommandHandler(CreateNotificationCommand)
export class CreateNotificationHandler implements ICommandHandler<CreateNotificationCommand> {
  private readonly logger = new Logger(CreateNotificationHandler.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(
    command: CreateNotificationCommand,
  ): Promise<Result<string, Error>> {
    const { id: requestedId, userId, title, content, type } = command;
    this.logger.log(`Creating notification for user ${userId}: "${title}"`);

    try {
      const id = requestedId || crypto.randomUUID();
      if (requestedId && (await this.notificationRepository.findById(id))) {
        return Result.ok(id);
      }
      const notification = NotificationEntity.createNew({
        id,
        userId,
        title,
        content,
        type,
      });

      await this.notificationRepository.save(notification);

      return Result.ok(id);
    } catch (error: unknown) {
      const cause =
        error instanceof Error
          ? error
          : new Error('Failed to create notification');
      this.logger.error(`Failed to create notification: ${cause.message}`);
      return Result.fail(cause);
    }
  }
}
