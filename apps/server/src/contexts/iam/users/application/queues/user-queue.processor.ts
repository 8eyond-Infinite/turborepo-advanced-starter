import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { USER_QUEUE, USER_JOBS } from './user-queue.constants';

@Processor(USER_QUEUE)
export class UserQueueProcessor extends WorkerHost {
    private readonly logger = new Logger(UserQueueProcessor.name);

    async process(job: Job<any, any, string>): Promise<any> {
        this.logger.log(`Processing job ${job.id} of type ${job.name}...`);

        switch (job.name) {
            case USER_JOBS.SEND_WELCOME_EMAIL: {
                const { email } = job.data;
                this.logger.log(`[Worker] Sending welcome email to ${email}...`);
                await new Promise((resolve) => setTimeout(resolve, 1000));
                this.logger.log(`[Worker] Welcome email successfully sent to ${email}!`);
                return { sent: true, email };
            }
            default: {
                this.logger.warn(`Unknown job name: ${job.name}`);
                throw new Error(`Job name ${job.name} not supported`);
            }
        }
    }
}
