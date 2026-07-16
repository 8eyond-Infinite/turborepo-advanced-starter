import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetActiveSessionsQuery } from '../get-active-sessions.query';
import { RedisService } from '@shared/infrastructure/cache/redis.service';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

export interface ActiveSessionResponse {
    jti: string;
    ip: string;
    userAgent: string;
    createdAt: string;
}

@QueryHandler(GetActiveSessionsQuery)
export class GetActiveSessionsQueryHandler implements IQueryHandler<GetActiveSessionsQuery, Result<{ sessions: ActiveSessionResponse[]; total: number }, DomainException>> {
    constructor(
        private readonly redisService: RedisService,
    ) { }

    async execute(query: GetActiveSessionsQuery): Promise<Result<{ sessions: ActiveSessionResponse[]; total: number }, DomainException>> {
        const { userId, page, limit } = query;
        const keys = await this.redisService.keys(`refresh_token:${userId}:*`);
        const allSessions: ActiveSessionResponse[] = [];

        for (const key of keys) {
            const data = await this.redisService.get<any>(key);
            if (data && typeof data === 'object') {
                allSessions.push({
                    jti: data.jti || '',
                    ip: data.ip || 'Unknown',
                    userAgent: data.userAgent || 'Unknown',
                    createdAt: data.createdAt || new Date().toISOString(),
                });
            } else {
                const parts = key.split(':');
                const jti = parts[parts.length - 1];
                allSessions.push({
                    jti,
                    ip: 'Unknown',
                    userAgent: 'Unknown',
                    createdAt: new Date().toISOString(),
                });
            }
        }

        // Sort by creation date descending (newest first)
        allSessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const total = allSessions.length;
        const skip = (page - 1) * limit;
        const paginatedSessions = allSessions.slice(skip, skip + limit);

        return Result.ok({ sessions: paginatedSessions, total });
    }
}
