export const SESSION_STORE = Symbol('SESSION_STORE');

export interface SessionData {
  jti: string;
  sessionId: string;
  ip: string;
  userAgent: string;
  createdAt: string;
  absoluteExpiresAt?: string;
}

export interface RefreshTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshRotationResult {
  rotated: boolean;
  tokens: RefreshTokens | null;
}

export interface ISessionStore {
  saveRefreshToken(
    userId: string,
    jti: string,
    sessionData: SessionData,
    ttlSeconds: number,
  ): Promise<void>;
  getRefreshTokenSession(
    userId: string,
    jti: string,
  ): Promise<SessionData | null>;
  rotateRefreshToken(
    userId: string,
    oldJti: string,
    newJti: string,
    sessionData: SessionData,
    tokens: RefreshTokens,
    ttlSeconds: number,
  ): Promise<RefreshRotationResult>;
  getRefreshReplay(userId: string, jti: string): Promise<RefreshTokens | null>;
  revokeRefreshToken(userId: string, jti: string): Promise<void>;
  revokeAllUserSessions(userId: string): Promise<void>;
  revokeOtherUserSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<void>;
  isRefreshTokenValid(userId: string, jti: string): Promise<boolean>;
  getUserSessions(userId: string): Promise<SessionData[]>;
}
