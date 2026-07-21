import { ICommand } from '@nestjs/cqrs';

export class MarkNotificationReadCommand implements ICommand {
    public readonly userId: string;
    public readonly notificationId?: string;
    public readonly all?: boolean;

    constructor(props: {
        userId: string;
        notificationId?: string;
        all?: boolean;
    }) {
        this.userId = props.userId;
        this.notificationId = props.notificationId;
        this.all = props.all;
    }
}
