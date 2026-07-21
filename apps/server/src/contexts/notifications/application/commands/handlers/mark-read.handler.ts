import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { MarkNotificationReadCommand } from '../mark-read.command';
import type { NotificationRepository } from '../../../domain/ports/notification.repository';
import { Result } from '@shared/domain/result';

@CommandHandler(MarkNotificationReadCommand)
export class MarkNotificationReadHandler implements ICommandHandler<MarkNotificationReadCommand> {
    private readonly logger = new Logger(MarkNotificationReadHandler.name);

    constructor(
        @Inject('NotificationRepository')
        private readonly notificationRepository: NotificationRepository,
    ) {}

    async execute(command: MarkNotificationReadCommand): Promise<Result<void, Error>> {
        const { userId, notificationId, all } = command;
        
        try {
            if (all) {
                this.logger.log(`Marking all notifications as read for user ${userId}`);
                await this.notificationRepository.markAllAsRead(userId);
            } else if (notificationId) {
                this.logger.log(`Marking notification ${notificationId} as read for user ${userId}`);
                const notification = await this.notificationRepository.findById(notificationId);
                
                if (!notification) {
                    return Result.fail(new Error(`Notification ${notificationId} not found`));
                }
                
                if (notification.userId !== userId) {
                    return Result.fail(new Error(`Unauthorized access to notification ${notificationId}`));
                }

                notification.markAsRead();
                await this.notificationRepository.save(notification);
            }

            return Result.ok(undefined);
        } catch (error: any) {
            this.logger.error(`Failed to mark notification(s) as read: ${error.message}`);
            return Result.fail(error);
        }
    }
}
