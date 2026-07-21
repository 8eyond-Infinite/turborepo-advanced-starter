import { ICommand } from '@nestjs/cqrs';

export class LogoutAllCommand implements ICommand {
    public readonly userId: string;

    constructor(props: {
        userId: string;
    }) {
        this.userId = props.userId;
    }
}
