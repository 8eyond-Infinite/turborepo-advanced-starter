import { IQuery } from '@nestjs/cqrs';

export class LoginQuery implements IQuery {
    constructor(
        public readonly email: string,
        public readonly passwordRaw: string,
        public readonly ip?: string,
        public readonly userAgent?: string,
    ) { }
}