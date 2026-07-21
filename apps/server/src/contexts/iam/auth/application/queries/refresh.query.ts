import { IQuery } from '@nestjs/cqrs';

export class RefreshQuery implements IQuery {
    constructor(
        public readonly userId: string,
        public readonly email: string,
        public readonly jti: string,
    ) { }
}
