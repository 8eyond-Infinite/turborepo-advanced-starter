import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IJobQueuePort } from '@shared/domain/ports/job-queue.port';

@Injectable()
export class BullmqQueueAdapter implements IJobQueuePort {
    constructor(private readonly moduleRef: ModuleRef) { }

    async addJob(queueName: string, jobName: string, data: any): Promise<void> {
        const queueToken = getQueueToken(queueName);
        const queue = this.moduleRef.get<Queue>(queueToken, { strict: false });
        await queue.add(jobName, data);
    }
}
