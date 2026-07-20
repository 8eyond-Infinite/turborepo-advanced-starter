import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { UserDeactivatedEvent } from '../../../../contexts/iam/users/domain/events/user-deactivated.event';
import { REALTIME_PORT } from '../../../domain/ports/realtime.port';
import type { IRealtimePort } from '../../../domain/ports/realtime.port';

@EventsHandler(UserDeactivatedEvent)
export class UserDeactivatedRealtimeHandler implements IEventHandler<UserDeactivatedEvent> {
    private readonly logger = new Logger(UserDeactivatedRealtimeHandler.name);

    constructor(
        @Inject(REALTIME_PORT)
        private readonly realtime: IRealtimePort,
    ) {}

    async handle(event: UserDeactivatedEvent) {
        const { userId, email } = event;
        this.logger.log(`Received UserDeactivatedEvent for user ${email} (ID: ${userId}). Sending real-time force logout signal...`);

        try {
            this.realtime.sendToUser(userId, 'force_logout', {
                message: 'Tài khoản của bạn đã bị khóa hoặc thu hồi quyền truy cập.',
            });
            this.logger.log(`Successfully sent real-time force logout signal to user ${email}`);
        } catch (error: any) {
            this.logger.error(`Failed to send real-time force logout signal to user ${email}: ${error.message}`);
        }
    }
}
