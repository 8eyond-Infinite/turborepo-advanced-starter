import { Inject, Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  CACHE_PORT,
  type ICachePort,
} from '@shared/application/ports/cache.port';
import {
  JOB_QUEUE_PORT,
  type IJobQueuePort,
} from '@shared/application/ports/job-queue.port';
import {
  REALTIME_PORT,
  type IRealtimePort,
} from '@shared/application/ports/realtime.port';
import { DomainEvent } from '@shared/domain/events/domain-event';
import { UserRegisteredEvent } from '@iam/users/domain/events/user-registered.event';
import { UserDeactivatedEvent } from '@iam/users/domain/events/user-deactivated.event';
import {
  USER_JOBS,
  USER_QUEUE,
} from '@iam/users/application/queues/user-queue.constants';
import { NotificationCreatedEvent } from '@/contexts/notifications/domain/events/notification-created.event';
import { CreateNotificationCommand } from '@/contexts/notifications/application/commands/create-notification.command';
import { Result } from '@shared/domain/result';

@Injectable()
export class OutboxEventRouter {
  constructor(
    @Inject(CACHE_PORT)
    private readonly cache: ICachePort,
    @Inject(JOB_QUEUE_PORT)
    private readonly jobQueue: IJobQueuePort,
    @Inject(REALTIME_PORT)
    private readonly realtime: IRealtimePort,
    private readonly commandBus: CommandBus,
  ) {}

  async dispatch(event: DomainEvent): Promise<void> {
    if (event instanceof UserRegisteredEvent) {
      await Promise.all([
        this.jobQueue.addJob(
          USER_QUEUE,
          USER_JOBS.SEND_WELCOME_EMAIL,
          { email: event.email },
          { jobId: event.eventId },
        ),
        this.createNotification(
          event.eventId,
          event.userId,
          'Welcome!',
          `Welcome ${event.username} (${event.email}) to the administration system.`,
          'SUCCESS',
        ),
      ]);
      return;
    }

    if (event instanceof UserDeactivatedEvent) {
      this.realtime.sendToUser(event.userId, 'force_logout', {
        message: 'Your account has been deactivated.',
      });
      await Promise.all([
        this.cache.invalidatePattern(`refresh_token:${event.userId}:*`),
        this.jobQueue.addJob(
          USER_QUEUE,
          USER_JOBS.SEND_DEACTIVATION_EMAIL,
          { email: event.email },
          { jobId: event.eventId },
        ),
        this.createNotification(
          event.eventId,
          event.userId,
          'Account deactivated',
          'Your account has been deactivated by a system administrator.',
          'WARNING',
        ),
      ]);
      return;
    }

    if (event instanceof NotificationCreatedEvent) {
      this.realtime.sendToUser(event.userId, 'notification_received', {
        id: event.id,
        userId: event.userId,
        title: event.title,
        content: event.content,
        type: event.type,
        isRead: event.isRead,
        createdAt: event.createdAt,
      });
      return;
    }

    throw new Error(`No outbox route registered for ${event.constructor.name}`);
  }

  private async createNotification(
    id: string,
    userId: string,
    title: string,
    content: string,
    type: string,
  ): Promise<void> {
    const result = await this.commandBus.execute<
      CreateNotificationCommand,
      Result<string, Error>
    >(
      new CreateNotificationCommand({
        id,
        userId,
        title,
        content,
        type,
      }),
    );
    result.unwrap();
  }
}
