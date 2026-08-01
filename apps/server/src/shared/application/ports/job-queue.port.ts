export const JOB_QUEUE_PORT = Symbol('JOB_QUEUE_PORT');

export interface IJobQueuePort {
  addJob(
    queueName: string,
    jobName: string,
    data: unknown,
    options?: { jobId?: string; sensitive?: boolean },
  ): Promise<void>;
}
