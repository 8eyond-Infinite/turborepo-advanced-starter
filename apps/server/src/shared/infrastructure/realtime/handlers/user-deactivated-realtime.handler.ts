import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { UserDeactivatedEvent } from '../../../../contexts/iam/users/domain/events/user-deactivated.event';
import { RealtimeService } from '../realtime.service';

@EventsHandler(UserDeactivatedEvent)
export class UserDeactivatedRealtimeHandler implements IEventHandler<UserDeactivatedEvent> {
    private readonly logger = new Logger(UserDeactivatedRealtimeHandler.name);

    constructor(private readonly realtimeService: RealtimeService) {}

    async handle(event: UserDeactivatedEvent) {
        const { userId, email } = event;
        this.logger.log(`Received UserDeactivatedEvent for user ${email} (ID: ${userId}). Sending real-time force logout signal...`);

        try {
            this.realtimeService.sendToUser(userId, 'force_logout', {
                message: 'Tài khoản của bạn đã bị khóa hoặc thu hồi quyền truy cập.',
            });
            this.logger.log(`Successfully sent real-time force logout signal to user ${email}`);
        } catch (error: any) {
            this.logger.error(`Failed to send real-time force logout signal to user ${email}: ${error.message}`);
        }
    }
}
