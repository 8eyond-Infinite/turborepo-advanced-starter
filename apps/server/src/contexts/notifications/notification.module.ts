import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaNotificationRepository } from './infrastructure/repositories/prisma-notification.repository';
import { NotificationController } from './presentation/controllers/notification.controller';
import { CreateNotificationHandler } from './application/commands/handlers/create-notification.handler';
import { MarkNotificationReadHandler } from './application/commands/handlers/mark-read.handler';
import { GetNotificationsHandler } from './application/queries/handlers/get-notifications.handler';
import { UserDeactivatedNotificationHandler } from './application/events/handlers/user-deactivated-notification.handler';
import { UserRegisteredNotificationHandler } from './application/events/handlers/user-registered-notification.handler';

const CommandHandlers = [CreateNotificationHandler, MarkNotificationReadHandler];
const QueryHandlers = [GetNotificationsHandler];
const EventHandlers = [UserDeactivatedNotificationHandler, UserRegisteredNotificationHandler];

@Module({
    imports: [CqrsModule],
    controllers: [NotificationController],
    providers: [
        {
            provide: 'NotificationRepository',
            useClass: PrismaNotificationRepository,
        },
        ...CommandHandlers,
        ...QueryHandlers,
        ...EventHandlers,
    ],
    exports: ['NotificationRepository'],
})
export class NotificationModule {}
