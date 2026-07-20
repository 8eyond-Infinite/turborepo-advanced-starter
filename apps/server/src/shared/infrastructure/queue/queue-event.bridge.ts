import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { JOB_QUEUE_PORT } from '../../domain/ports/job-queue.port';
import type { IJobQueuePort } from '../../domain/ports/job-queue.port';
import type { IQueueEvent } from '../../domain/events/queue-event.interface';

@Injectable()
export class QueueEventBridge implements OnModuleInit {
    private readonly logger = new Logger(QueueEventBridge.name);

    constructor(
        private readonly eventBus: EventBus,
        @Inject(JOB_QUEUE_PORT)
        private readonly jobQueue: IJobQueuePort,
    ) {}

    onModuleInit() {
        this.logger.log('Initializing Queue Event Bridge to listen to all Domain Events...');

        this.eventBus.subject$.subscribe({
            next: async (event) => {
                if (this.isQueueEvent(event)) {
                    const queueName = event.getQueueName();
                    const jobName = event.getJobName();
                    const jobData = event.toJobData();

                    this.logger.log(`Bridging Domain Event to Job Queue: Queue='${queueName}' Job='${jobName}'`);

                    try {
                        await this.jobQueue.addJob(queueName, jobName, jobData);
                        this.logger.log(`Successfully dispatched job '${jobName}' on queue '${queueName}'`);
                    } catch (error: any) {
                        this.logger.error(`Failed to dispatch job '${jobName}' on queue '${queueName}': ${error.message}`);
                    }
                }
            },
            error: (err) => {
                this.logger.error(`Error in event stream: ${err.message}`);
            }
        });
    }

    private isQueueEvent(event: any): event is IQueueEvent {
        return event && typeof event.getQueueName === 'function';
    }
}
