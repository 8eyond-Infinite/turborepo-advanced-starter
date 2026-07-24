import { ICommand } from '@nestjs/cqrs';

export class LoginCommand implements ICommand {
    constructor(
        public readonly email: string,
        public readonly passwordRaw: string,
        public readonly ip?: string,
        public readonly userAgent?: string,
    ) { }
}