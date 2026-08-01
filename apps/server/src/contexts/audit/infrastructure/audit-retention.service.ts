import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@infrastructure/database/prisma.service';

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1_000;
const DELETE_BATCH_SIZE = 1_000;
const MAX_BATCHES_PER_CYCLE = 100;

@Injectable()
export class AuditRetentionService
  implements OnApplicationBootstrap, OnModuleDestroy, OnApplicationShutdown
{
  private readonly logger = new Logger(AuditRetentionService.name);
  private timer?: NodeJS.Timeout;
  private activeCleanup?: Promise<number>;
  private shuttingDown = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    const retentionDays = this.configService.get<number>(
      'AUDIT_RETENTION_DAYS',
      0,
    );
    if (retentionDays <= 0) return;

    this.triggerCleanup(retentionDays);
    this.timer = setInterval(
      () => this.triggerCleanup(retentionDays),
      CLEANUP_INTERVAL_MS,
    );
    this.timer.unref();
  }

  async cleanupExpired(retentionDays: number): Promise<number> {
    if (!Number.isInteger(retentionDays) || retentionDays <= 0) {
      this.logger.warn(
        'Audit retention cleanup skipped because retentionDays is not a positive integer',
      );
      return 0;
    }
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1_000);
    try {
      let totalDeleted = 0;
      let batches = 0;
      while (batches < MAX_BATCHES_PER_CYCLE) {
        const expired = await this.prisma.auditLog.findMany({
          where: { createdAt: { lt: cutoff } },
          orderBy: { createdAt: 'asc' },
          take: DELETE_BATCH_SIZE,
          select: { id: true },
        });
        if (expired.length === 0) break;

        const deleted = await this.prisma.auditLog.deleteMany({
          where: { id: { in: expired.map(({ id }) => id) } },
        });
        totalDeleted += deleted.count;
        batches += 1;
        if (expired.length < DELETE_BATCH_SIZE) break;
      }

      if (batches === MAX_BATCHES_PER_CYCLE) {
        this.logger.warn(
          `Audit retention reached the ${MAX_BATCHES_PER_CYCLE * DELETE_BATCH_SIZE} record safety limit; remaining backlog will continue next cycle`,
        );
      }
      if (totalDeleted > 0) {
        const batchLabel = batches === 1 ? 'batch' : 'batches';
        this.logger.log(
          `Audit retention removed ${totalDeleted} records older than ${retentionDays} days in ${batches} ${batchLabel}`,
        );
      }
      return totalDeleted;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Audit retention failed: ${message}`);
      return 0;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.stop();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.stop();
  }

  private triggerCleanup(retentionDays: number): void {
    if (this.shuttingDown || this.activeCleanup) return;
    this.activeCleanup = this.cleanupExpired(retentionDays).finally(() => {
      this.activeCleanup = undefined;
    });
  }

  private async stop(): Promise<void> {
    this.shuttingDown = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    await this.activeCleanup;
  }
}
