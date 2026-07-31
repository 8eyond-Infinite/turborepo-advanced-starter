import { getQueueToken } from '@nestjs/bullmq';
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
    const service = new MetricsService(prisma as never, moduleRef as never);

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
});
