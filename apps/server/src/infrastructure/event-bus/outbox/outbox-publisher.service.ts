import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { rehydrateDomainEvent } from './outbox-event.mapper';
import type { OutboxEvent } from '@repo/database';
import { OutboxEventRouter } from './outbox-event.router';

const OUTBOX_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  PUBLISHED: 'PUBLISHED',
  FAILED: 'FAILED',
} as const;

@Injectable()
export class OutboxPublisherService
  implements OnApplicationBootstrap, OnModuleDestroy, OnApplicationShutdown
{
  private readonly logger = new Logger(OutboxPublisherService.name);
  private readonly maxAttempts = 10;
  private timer?: NodeJS.Timeout;
  private polling = false;
  private shuttingDown = false;
  private activePoll?: Promise<void>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly router: OutboxEventRouter,
    private readonly configService: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    const intervalMs = this.configService.get<number>(
      'OUTBOX_POLL_INTERVAL_MS',
      100,
    );
    this.timer = setInterval(() => {
      this.triggerPoll();
    }, intervalMs);
    this.timer.unref();
    this.triggerPoll();
  }

  async onModuleDestroy(): Promise<void> {
    await this.stopPolling();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.stopPolling();
  }

  private async stopPolling(): Promise<void> {
    this.shuttingDown = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    await this.activePoll;
  }

  private triggerPoll(): void {
    if (this.shuttingDown || this.activePoll) return;
    this.activePoll = this.poll().finally(() => {
      this.activePoll = undefined;
    });
  }

  async poll(): Promise<void> {
    if (this.shuttingDown || this.polling) return;
    this.polling = true;

    try {
      await this.recoverStaleClaims();
      const candidates = await this.prisma.outboxEvent.findMany({
        where: {
          status: OUTBOX_STATUS.PENDING,
          availableAt: { lte: new Date() },
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });

      for (const candidate of candidates) {
        await this.publishCandidate(candidate);
      }
    } catch (error: unknown) {
      this.logger.error(
        `Outbox polling failed: ${this.getErrorMessage(error)}`,
      );
    } finally {
      this.polling = false;
    }
  }

  private async publishCandidate(candidate: OutboxEvent): Promise<void> {
    const claimed = await this.prisma.outboxEvent.updateMany({
      where: {
        id: candidate.id,
        status: OUTBOX_STATUS.PENDING,
      },
      data: {
        status: OUTBOX_STATUS.PROCESSING,
        lockedAt: new Date(),
        attempts: { increment: 1 },
      },
    });
    if (claimed.count === 0) return;

    try {
      const event = rehydrateDomainEvent(candidate);
      await this.router.dispatch(event);
      await this.prisma.outboxEvent.update({
        where: { id: candidate.id },
        data: {
          status: OUTBOX_STATUS.PUBLISHED,
          processedAt: new Date(),
          lockedAt: null,
          lastError: null,
        },
      });
    } catch (error: unknown) {
      const attempts = candidate.attempts + 1;
      const exhausted = attempts >= this.maxAttempts;
      const retryDelayMs = Math.min(2 ** attempts * 1_000, 60_000);

      await this.prisma.outboxEvent.update({
        where: { id: candidate.id },
        data: {
          status: exhausted ? OUTBOX_STATUS.FAILED : OUTBOX_STATUS.PENDING,
          availableAt: new Date(Date.now() + retryDelayMs),
          lockedAt: null,
          lastError: this.getErrorMessage(error).slice(0, 2_000),
        },
      });
      this.logger.error(
        `Failed to publish outbox event ${candidate.id}: ${this.getErrorMessage(error)}`,
      );
    }
  }

  private async recoverStaleClaims(): Promise<void> {
    const staleBefore = new Date(Date.now() - 60_000);
    await this.prisma.outboxEvent.updateMany({
      where: {
        status: OUTBOX_STATUS.PROCESSING,
        lockedAt: { lt: staleBefore },
      },
      data: {
        status: OUTBOX_STATUS.PENDING,
        lockedAt: null,
      },
    });
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
