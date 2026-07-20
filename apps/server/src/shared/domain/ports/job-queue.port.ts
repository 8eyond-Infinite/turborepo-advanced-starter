export const JOB_QUEUE_PORT = Symbol('JobQueuePort');

export interface IJobQueuePort {
    addJob(queueName: string, jobName: string, data: any): Promise<void>;
}
