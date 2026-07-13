import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { RefreshQuery } from '../refresh.query';

@QueryHandler(RefreshQuery)
export class RefreshQueryHandler implements IQueryHandler<RefreshQuery> {
    constructor(
        private readonly jwtService: JwtService,
    ) { }

    async execute(query: RefreshQuery): Promise<{ accessToken: string; refreshToken: string }> {
        const { userId, email } = query;

        const payload = { sub: userId, email };

        const accessToken = this.jwtService.sign(payload, {
            secret: process.env.JWT_ACCESS_SECRET,
            expiresIn: '15m',
        });

        const refreshToken = this.jwtService.sign(payload, {
            secret: process.env.JWT_REFRESH_SECRET,
            expiresIn: '7d',
        });

        return { accessToken, refreshToken };
    }
}
