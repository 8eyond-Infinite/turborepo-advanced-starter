import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MetricsService } from './metrics.service';
import { USER_QUEUE } from '@iam/users/application/queues/user-queue.constants';

describe('MetricsService', () => {
  it('exports bounded outbox and BullMQ operational metrics', async () => {
    const now = Date.now();
    const prisma = {
      outboxEvent: {
        count: jest.fn().mockResolvedValue(2),
        findFirst: jest
          .fn()
          .mockResolvedValue({ occurredAt: new Date(now - 5_000) }),
      },
    };
    const queue = {
      getJobCounts: jest.fn().mockResolvedValue({
        waiting: 3,
        active: 1,
        delayed: 0,
        completed: 8,
        failed: 2,
        paused: 0,
      }),
      getJobs: jest.fn().mockResolvedValue([{ timestamp: now - 10_000 }]),
    };
    const moduleRef = {
      get: jest.fn((token: string) => {
        expect(token).toBe(getQueueToken(USER_QUEUE));
        return queue;
      }),
    };
    const service = new MetricsService(
      prisma as never,
      moduleRef as never,
      new ConfigService(),
    );

    service.onModuleInit();
    const output = await service.metrics();

    expect(output).toContain(
      `bullmq_jobs{queue="${USER_QUEUE}",status="waiting"} 3`,
    );
    expect(output).toContain(
      `bullmq_jobs{queue="${USER_QUEUE}",status="failed"} 2`,
    );
    expect(output).toMatch(
      new RegExp(
        `bullmq_oldest_waiting_job_age_seconds\\{queue="${USER_QUEUE}"\\} 1\\d(?:\\.\\d+)?`,
      ),
    );
    expect(output).toContain('outbox_events{status="pending"} 2');
  });

  it('exports backup freshness when a heartbeat path is configured', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'backup-metrics-'));
    const statusFile = join(directory, '.last-success');
    await writeFile(
      statusFile,
      'completed_at=2026-07-31T00:00:00Z\nbackup_file=starter.dump\n',
    );

    const prisma = {
      outboxEvent: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const queue = {
      getJobCounts: jest.fn().mockResolvedValue({}),
      getJobs: jest.fn().mockResolvedValue([]),
    };
    const moduleRef = { get: jest.fn().mockReturnValue(queue) };
    const service = new MetricsService(
      prisma as never,
      moduleRef as never,
      new ConfigService({ BACKUP_STATUS_FILE: statusFile }),
    );

    try {
      service.onModuleInit();
      const available = await service.metrics();
      expect(available).toContain('backup_status_available 1');
      expect(available).toMatch(
        /backup_last_success_timestamp_seconds [1-9]\d*(?:\.\d+)?/,
      );
      expect(available).toMatch(/backup_age_seconds \d+(?:\.\d+)?/);

      await rm(statusFile);
      const missing = await service.metrics();
      expect(missing).toContain('backup_status_available 0');
      expect(missing).toContain('backup_last_success_timestamp_seconds 0');
      expect(missing).toContain('backup_age_seconds -1');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
