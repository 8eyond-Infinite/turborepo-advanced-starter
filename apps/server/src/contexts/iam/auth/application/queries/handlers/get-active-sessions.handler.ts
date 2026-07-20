import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetActiveSessionsQuery } from '../get-active-sessions.query';
import { CACHE_PORT } from '@shared/domain/ports/cache.port';
import type { ICachePort } from '@shared/domain/ports/cache.port';
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
        @Inject(CACHE_PORT)
        private readonly cache: ICachePort,
    ) { }

    async execute(query: GetActiveSessionsQuery): Promise<Result<{ sessions: ActiveSessionResponse[]; total: number }, DomainException>> {
        const { userId, page, limit } = query;
        const keys = await this.cache.keys(`refresh_token:${userId}:*`);
        const allSessions: ActiveSessionResponse[] = [];

        for (const key of keys) {
            const data = await this.cache.get<any>(key);
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
        allSessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const total = allSessions.length;
        const skip = (page - 1) * limit;
        const paginatedSessions = allSessions.slice(skip, skip + limit);

        return Result.ok({ sessions: paginatedSessions, total });
    }
}
