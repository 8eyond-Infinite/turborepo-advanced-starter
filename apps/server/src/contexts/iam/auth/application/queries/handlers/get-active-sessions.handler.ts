import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetActiveSessionsQuery } from '../get-active-sessions.query';
import { SESSION_STORE, ISessionStore, SessionData } from '../../../domain/ports/session-store.port';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

@QueryHandler(GetActiveSessionsQuery)
export class GetActiveSessionsQueryHandler implements IQueryHandler<GetActiveSessionsQuery, Result<{ sessions: SessionData[]; total: number }, DomainException>> {
    constructor(
        @Inject(SESSION_STORE)
        private readonly sessionStore: ISessionStore,
    ) { }

    async execute(query: GetActiveSessionsQuery): Promise<Result<{ sessions: SessionData[]; total: number }, DomainException>> {
        const { userId, page, limit } = query;
        const allSessions = await this.sessionStore.getUserSessions(userId);

        allSessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const total = allSessions.length;
        const skip = (page - 1) * limit;
        const paginatedSessions = allSessions.slice(skip, skip + limit);

        return Result.ok({ sessions: paginatedSessions, total });
    }
}

