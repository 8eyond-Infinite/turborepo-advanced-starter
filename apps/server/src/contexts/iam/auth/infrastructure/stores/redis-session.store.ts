import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { RedisService } from '@infrastructure/cache/redis.service';
import {
  ISessionStore,
  RefreshTokens,
  RefreshRotationResult,
  SessionData,
} from '../../application/ports/session-store.port';

const REFRESH_REPLAY_TTL_SECONDS = 5;
interface StoredRefreshReplay {
  successorJti: string;
  encryptedTokens: string;
}

@Injectable()
export class RedisSessionStore implements ISessionStore {
  private readonly replayEncryptionKey: Buffer;

  constructor(
    private readonly cache: RedisService,
    configService: ConfigService,
  ) {
    this.replayEncryptionKey = createHash('sha256')
      .update(configService.getOrThrow<string>('JWT_REFRESH_SECRET'))
      .digest();
  }

  private encryptReplay(tokens: RefreshTokens): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.replayEncryptionKey, iv);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(tokens), 'utf8'),
      cipher.final(),
    ]);
    return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString(
      'base64url',
    );
  }

  private decryptReplay(value: string): RefreshTokens | null {
    try {
      const payload = Buffer.from(value, 'base64url');
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.replayEncryptionKey,
        payload.subarray(0, 12),
      );
      decipher.setAuthTag(payload.subarray(12, 28));
      const tokens = JSON.parse(
        Buffer.concat([
          decipher.update(payload.subarray(28)),
          decipher.final(),
        ]).toString('utf8'),
      ) as Partial<RefreshTokens>;
      return typeof tokens.accessToken === 'string' &&
        typeof tokens.refreshToken === 'string'
        ? { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }
        : null;
    } catch {
      return null;
    }
  }

  private buildKey(userId: string, jti: string): string {
    return `refresh_token:${userId}:${jti}`;
  }

  private buildReplayKey(userId: string, jti: string): string {
    return `refresh_replay:${userId}:${jti}`;
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
    const replayKeys = await this.cache.scan(`refresh_replay:${userId}:*`);
    const successorReplayKeys = (
      await Promise.all(
        replayKeys.map(async (key) => {
          const replay = await this.cache.get<StoredRefreshReplay>(key);
          return replay?.successorJti === jti ? key : null;
        }),
      )
    ).filter((key): key is string => key !== null);
    await Promise.all([
      this.cache.del(this.buildKey(userId, jti)),
      this.cache.del(this.buildReplayKey(userId, jti)),
      ...successorReplayKeys.map((key) => this.cache.del(key)),
    ]);
  }

  async getRefreshReplay(
    userId: string,
    jti: string,
  ): Promise<RefreshTokens | null> {
    const replay = await this.cache.get<StoredRefreshReplay>(
      this.buildReplayKey(userId, jti),
    );
    return replay ? this.decryptReplay(replay.encryptedTokens) : null;
  }

  async rotateRefreshToken(
    userId: string,
    oldJti: string,
    newJti: string,
    sessionData: SessionData,
    tokens: RefreshTokens,
    ttlSeconds: number,
  ): Promise<RefreshRotationResult> {
    const result =
      await this.cache.replaceIfPresentOrGetReplay<StoredRefreshReplay>(
        this.buildKey(userId, oldJti),
        this.buildKey(userId, newJti),
        this.buildReplayKey(userId, oldJti),
        sessionData,
        { successorJti: newJti, encryptedTokens: this.encryptReplay(tokens) },
        ttlSeconds,
        REFRESH_REPLAY_TTL_SECONDS,
      );
    return {
      rotated: result.replaced,
      tokens: result.replay
        ? this.decryptReplay(result.replay.encryptedTokens)
        : null,
    };
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await Promise.all([
      this.cache.invalidatePattern(`refresh_token:${userId}:*`),
      this.cache.invalidatePattern(`refresh_replay:${userId}:*`),
    ]);
  }

  async revokeOtherUserSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<void> {
    await this.cache.invalidatePattern(`refresh_replay:${userId}:*`);
    const keys = await this.cache.scan(`refresh_token:${userId}:*`);
    await Promise.all(
      keys.map(async (key) => {
        const session = await this.cache.get<SessionData>(key);
        const sessionId = session?.sessionId ?? session?.jti;
        if (session && sessionId !== currentSessionId) {
          await this.cache.del(key);
        }
      }),
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
        sessions.push({
          ...data,
          sessionId: data.sessionId ?? data.jti,
        });
      }
    }

    return sessions;
  }
}
