import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { CreateNotificationCommand } from '../create-notification.command';
import { NotificationEntity } from '../../../domain/notification.entity';
import type { NotificationRepository } from '../../../domain/ports/notification.repository';
import { Result } from '@shared/domain/result';
import * as crypto from 'crypto';

@CommandHandler(CreateNotificationCommand)
export class CreateNotificationHandler implements ICommandHandler<CreateNotificationCommand> {
    private readonly logger = new Logger(CreateNotificationHandler.name);

    constructor(
        @Inject('NotificationRepository')
        private readonly notificationRepository: NotificationRepository,
    ) {}

    async execute(command: CreateNotificationCommand): Promise<Result<string, Error>> {
        const { userId, title, content, type } = command;
        this.logger.log(`Creating notification for user ${userId}: "${title}"`);

        try {
            const id = crypto.randomUUID();
            const notification = NotificationEntity.createNew({
                id,
                userId,
                title,
                content,
                type,
            });

            await this.notificationRepository.save(notification);
            
            return Result.ok(id);
        } catch (error: any) {
            this.logger.error(`Failed to create notification: ${error.message}`);
            return Result.fail(error);
        }
    }
}
