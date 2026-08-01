import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IJobQueuePort } from '@shared/application/ports/job-queue.port';
import { getCorrelationId } from '@infrastructure/observability/correlation-context';

@Injectable()
export class BullmqQueueAdapter implements IJobQueuePort {
  constructor(private readonly moduleRef: ModuleRef) {}

  async addJob(
    queueName: string,
    jobName: string,
    data: unknown,
    options?: { jobId?: string; sensitive?: boolean },
  ): Promise<void> {
    const queueToken = getQueueToken(queueName);
    const queue = this.moduleRef.get<Queue>(queueToken, { strict: false });

    // Gắn correlation ID vào MỌI job tại một chỗ duy nhất, thay vì bắt từng
    // nơi gọi phải nhớ truyền — worker nhờ đó log được request gốc.
    const correlationId = getCorrelationId();
    const payload =
      correlationId && data && typeof data === 'object'
        ? { ...(data as Record<string, unknown>), correlationId }
        : data;

    await queue.add(jobName, payload, {
      jobId: options?.jobId,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1_000,
      },
      removeOnComplete: options?.sensitive ? true : 1_000,
      removeOnFail: options?.sensitive ? true : 5_000,
    });
  }
}
