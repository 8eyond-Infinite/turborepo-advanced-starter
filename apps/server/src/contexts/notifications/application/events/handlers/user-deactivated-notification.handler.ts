import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { UserDeactivatedEvent } from '../../../../iam/users/domain/events/user-deactivated.event';
import { CreateNotificationCommand } from '../../commands/create-notification.command';

@EventsHandler(UserDeactivatedEvent)
export class UserDeactivatedNotificationHandler implements IEventHandler<UserDeactivatedEvent> {
    private readonly logger = new Logger(UserDeactivatedNotificationHandler.name);

    constructor(private readonly commandBus: CommandBus) {}

    async handle(event: UserDeactivatedEvent) {
        const { userId, email } = event;
        this.logger.log(`Handling UserDeactivatedEvent for ${email} inside notifications context. Dispatching notification creation...`);

        await this.commandBus.execute(
            new CreateNotificationCommand({
                userId,
                title: 'Vô hiệu hóa tài khoản',
                content: 'Tài khoản của bạn đã bị vô hiệu hóa bởi Quản trị viên hệ thống.',
                type: 'WARNING',
            })
        );
    }
}
