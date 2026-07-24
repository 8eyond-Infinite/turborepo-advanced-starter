import { ICommand } from '@nestjs/cqrs';

export class RefreshCommand implements ICommand {
    constructor(
        public readonly userId: string,
        public readonly email: string,
        public readonly jti: string,
    ) { }
}
