export interface IQueueEvent {
    getQueueName(): string;
    getJobName(): string;
    toJobData(): any;
}
