import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaNotificationRepository } from './infrastructure/repositories/prisma-notification.repository';
import { NotificationController } from './presentation/controllers/notification.controller';
import { CreateNotificationHandler } from './application/commands/handlers/create-notification.handler';
import { MarkNotificationReadHandler } from './application/commands/handlers/mark-read.handler';
import { GetNotificationsHandler } from './application/queries/handlers/get-notifications.handler';
import { NOTIFICATION_REPOSITORY } from './domain/ports/notification.repository';

const CommandHandlers = [
  CreateNotificationHandler,
  MarkNotificationReadHandler,
];
const QueryHandlers = [GetNotificationsHandler];

@Module({
  imports: [CqrsModule],
  controllers: [NotificationController],
  providers: [
    {
      provide: NOTIFICATION_REPOSITORY,
      useClass: PrismaNotificationRepository,
    },
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: [NOTIFICATION_REPOSITORY],
})
export class NotificationsModule {}
