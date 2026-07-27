export const SESSION_STORE = Symbol('SESSION_STORE');

export interface SessionData {
  jti: string;
  ip: string;
  userAgent: string;
  createdAt: string;
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
    ttlSeconds: number,
  ): Promise<boolean>;
  revokeRefreshToken(userId: string, jti: string): Promise<void>;
  revokeAllUserSessions(userId: string): Promise<void>;
  isRefreshTokenValid(userId: string, jti: string): Promise<boolean>;
  getUserSessions(userId: string): Promise<SessionData[]>;
}
