import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { UserRegisteredEvent } from '../../../../iam/users/domain/events/user-registered.event';
import { CreateNotificationCommand } from '../../commands/create-notification.command';

@EventsHandler(UserRegisteredEvent)
export class UserRegisteredNotificationHandler implements IEventHandler<UserRegisteredEvent> {
    private readonly logger = new Logger(UserRegisteredNotificationHandler.name);

    constructor(private readonly commandBus: CommandBus) {}

    async handle(event: UserRegisteredEvent) {
        const { userId, email, username } = event;
        this.logger.log(`Handling UserRegisteredEvent for ${email} inside notifications context. Dispatching welcome notification...`);

        await this.commandBus.execute(
            new CreateNotificationCommand({
                userId,
                title: 'Chào mừng thành viên mới!',
                content: `Chào mừng ${username} (${email}) đã tham gia hệ thống quản trị của chúng tôi!`,
                type: 'SUCCESS',
            })
        );
    }
}
