import { Injectable, OnModuleInit } from '@nestjs/common';
import { collectDefaultMetrics, Gauge, Histogram, Registry } from 'prom-client';
import { PrismaService } from '@infrastructure/database/prisma.service';

const OUTBOX_STATUSES = ['PENDING', 'PROCESSING', 'FAILED'] as const;

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

  constructor(private readonly prisma: PrismaService) {}

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
  }

  metrics(): Promise<string> {
    return this.registry.metrics();
  }
}
