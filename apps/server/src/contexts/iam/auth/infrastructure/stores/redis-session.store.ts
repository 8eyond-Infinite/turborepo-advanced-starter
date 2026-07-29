import { Injectable } from '@nestjs/common';
import { RedisService } from '@infrastructure/cache/redis.service';
import {
  ISessionStore,
  SessionData,
} from '../../domain/ports/session-store.port';

@Injectable()
export class RedisSessionStore implements ISessionStore {
  constructor(private readonly cache: RedisService) {}

  private buildKey(userId: string, jti: string): string {
    return `refresh_token:${userId}:${jti}`;
  }

  async saveRefreshToken(
    userId: string,
    jti: string,
    sessionData: SessionData,
    ttlSeconds: number,
  ): Promise<void> {
    await this.cache.set(this.buildKey(userId, jti), sessionData, ttlSeconds);
  }

  async getRefreshTokenSession(
    userId: string,
    jti: string,
  ): Promise<SessionData | null> {
    return await this.cache.get<SessionData>(this.buildKey(userId, jti));
  }

  async revokeRefreshToken(userId: string, jti: string): Promise<void> {
    await this.cache.del(this.buildKey(userId, jti));
  }

  async rotateRefreshToken(
    userId: string,
    oldJti: string,
    newJti: string,
    sessionData: SessionData,
    ttlSeconds: number,
  ): Promise<boolean> {
    return this.cache.replaceIfPresent(
      this.buildKey(userId, oldJti),
      this.buildKey(userId, newJti),
      sessionData,
      ttlSeconds,
    );
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.cache.invalidatePattern(`refresh_token:${userId}:*`);
  }

  async revokeOtherUserSessions(
    userId: string,
    currentJti: string,
  ): Promise<void> {
    const currentKey = this.buildKey(userId, currentJti);
    const keys = await this.cache.scan(`refresh_token:${userId}:*`);
    await Promise.all(
      keys
        .filter((key) => key !== currentKey)
        .map((key) => this.cache.del(key)),
    );
  }

  async isRefreshTokenValid(userId: string, jti: string): Promise<boolean> {
    const data = await this.cache.get<SessionData>(this.buildKey(userId, jti));
    return data !== null;
  }

  async getUserSessions(userId: string): Promise<SessionData[]> {
    const keys = await this.cache.scan(`refresh_token:${userId}:*`);
    const sessions: SessionData[] = [];

    for (const key of keys) {
      const data = await this.cache.get<SessionData>(key);
      if (data) {
        sessions.push(data);
      }
    }

    return sessions;
  }
}
