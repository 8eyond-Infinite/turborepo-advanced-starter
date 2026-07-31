import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { collectDefaultMetrics, Gauge, Histogram, Registry } from 'prom-client';
import { stat } from 'node:fs/promises';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { ModuleRef } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bullmq';
import type { Job, Queue } from 'bullmq';
import { USER_QUEUE } from '@iam/users/application/queues/user-queue.constants';

const OUTBOX_STATUSES = ['PENDING', 'PROCESSING', 'FAILED'] as const;
const QUEUE_STATUSES = [
  'waiting',
  'active',
  'delayed',
  'completed',
  'failed',
  'paused',
] as const;

@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry = new Registry();

  readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'] as const,
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [this.registry],
  });

  constructor(
    private readonly prisma: PrismaService,
    private readonly moduleRef: ModuleRef,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    collectDefaultMetrics({ register: this.registry });

    // Outbox depth and lag are the two signals development-and-deployment.md §9
    // requires for alerting. Values are computed at scrape time; both queries
    // hit the (status, availableAt) index.
    const prisma = this.prisma;

    new Gauge({
      name: 'outbox_events',
      help: 'Number of outbox events by status',
      labelNames: ['status'] as const,
      registers: [this.registry],
      async collect() {
        const counts = await Promise.all(
          OUTBOX_STATUSES.map((status) =>
            prisma.outboxEvent.count({ where: { status } }),
          ),
        );
        OUTBOX_STATUSES.forEach((status, index) => {
          this.set({ status: status.toLowerCase() }, counts[index] ?? 0);
        });
      },
    });

    new Gauge({
      name: 'outbox_oldest_pending_age_seconds',
      help: 'Age in seconds of the oldest PENDING outbox event (0 when none)',
      registers: [this.registry],
      async collect() {
        const oldest = await prisma.outboxEvent.findFirst({
          where: { status: 'PENDING' },
          orderBy: { occurredAt: 'asc' },
          select: { occurredAt: true },
        });
        this.set(
          oldest
            ? Math.max(0, (Date.now() - oldest.occurredAt.getTime()) / 1000)
            : 0,
        );
      },
    });

    // The API observes queue state through the same Redis-backed BullMQ queue
    // used by the producer and worker. The worker does not need a second HTTP
    // server solely for Prometheus scraping.
    const queue = this.moduleRef.get<Queue>(getQueueToken(USER_QUEUE), {
      strict: false,
    });

    new Gauge({
      name: 'bullmq_jobs',
      help: 'Number of BullMQ jobs by queue and status',
      labelNames: ['queue', 'status'] as const,
      registers: [this.registry],
      async collect() {
        const counts = await queue.getJobCounts(...QUEUE_STATUSES);
        for (const status of QUEUE_STATUSES) {
          this.set({ queue: USER_QUEUE, status }, counts[status] ?? 0);
        }
      },
    });

    new Gauge({
      name: 'bullmq_oldest_waiting_job_age_seconds',
      help: 'Age of the oldest waiting or delayed BullMQ job in seconds',
      labelNames: ['queue'] as const,
      registers: [this.registry],
      async collect() {
        const jobs = await queue.getJobs(['waiting', 'delayed'], 0, 0, true);
        const oldest = jobs[0] as Job | undefined;
        this.set(
          { queue: USER_QUEUE },
          oldest ? Math.max(0, (Date.now() - oldest.timestamp) / 1000) : 0,
        );
      },
    });

    const backupStatusFile =
      this.configService.get<string>('BACKUP_STATUS_FILE');
    if (backupStatusFile) {
      new Gauge({
        name: 'backup_status_available',
        help: 'Whether the successful backup heartbeat can be read (1 or 0)',
        registers: [this.registry],
        async collect() {
          try {
            await stat(backupStatusFile);
            this.set(1);
          } catch {
            this.set(0);
          }
        },
      });

      new Gauge({
        name: 'backup_last_success_timestamp_seconds',
        help: 'Unix timestamp of the last fully successful backup cycle',
        registers: [this.registry],
        async collect() {
          try {
            const status = await stat(backupStatusFile);
            this.set(status.mtimeMs / 1_000);
          } catch {
            this.set(0);
          }
        },
      });

      new Gauge({
        name: 'backup_age_seconds',
        help: 'Age of the last fully successful backup cycle (-1 when unavailable)',
        registers: [this.registry],
        async collect() {
          try {
            const status = await stat(backupStatusFile);
            this.set(Math.max(0, (Date.now() - status.mtimeMs) / 1_000));
          } catch {
            this.set(-1);
          }
        },
      });
    }
  }

  metrics(): Promise<string> {
    return this.registry.metrics();
  }
}
