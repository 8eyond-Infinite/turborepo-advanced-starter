import { Injectable, Inject } from '@nestjs/common';
import { CACHE_PORT, ICachePort } from '@shared/domain/ports/cache.port';
import { ISessionStore, SessionData } from '../../domain/ports/session-store.port';

@Injectable()
export class RedisSessionStore implements ISessionStore {
    constructor(
        @Inject(CACHE_PORT)
        private readonly cache: ICachePort,
    ) {}

    private buildKey(userId: string, jti: string): string {
        return `refresh_token:${userId}:${jti}`;
    }

    async saveRefreshToken(userId: string, jti: string, sessionData: SessionData, ttlSeconds: number): Promise<void> {
        await this.cache.set(this.buildKey(userId, jti), sessionData, ttlSeconds);
    }

    async getRefreshTokenSession(userId: string, jti: string): Promise<SessionData | null> {
        return await this.cache.get<SessionData>(this.buildKey(userId, jti));
    }

    async revokeRefreshToken(userId: string, jti: string): Promise<void> {
        await this.cache.del(this.buildKey(userId, jti));
    }

    async revokeAllUserSessions(userId: string): Promise<void> {
        await this.cache.invalidatePattern(`refresh_token:${userId}:*`);
    }

    async isRefreshTokenValid(userId: string, jti: string): Promise<boolean> {
        const data = await this.cache.get<any>(this.buildKey(userId, jti));
        return data !== null;
    }

    async getUserSessions(userId: string): Promise<SessionData[]> {
        const keys = await this.cache.keys(`refresh_token:${userId}:*`);
        const sessions: SessionData[] = [];

        for (const key of keys) {
            const data = await this.cache.get<any>(key);
            if (data && typeof data === 'object') {
                sessions.push({
                    jti: data.jti || '',
                    ip: data.ip || 'Unknown',
                    userAgent: data.userAgent || 'Unknown',
                    createdAt: data.createdAt || new Date().toISOString(),
                });
            } else {
                const parts = key.split(':');
                const jti = parts[parts.length - 1];
                sessions.push({
                    jti,
                    ip: 'Unknown',
                    userAgent: 'Unknown',
                    createdAt: new Date().toISOString(),
                });
            }
        }

        return sessions;
    }
}
