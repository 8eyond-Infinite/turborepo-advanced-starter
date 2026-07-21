import { ICommand } from '@nestjs/cqrs';

export class RevokeSessionCommand implements ICommand {
    public readonly userId: string;
    public readonly jti: string;

    constructor(props: {
        userId: string;
        jti: string;
    }) {
        this.userId = props.userId;
        this.jti = props.jti;
    }
}
