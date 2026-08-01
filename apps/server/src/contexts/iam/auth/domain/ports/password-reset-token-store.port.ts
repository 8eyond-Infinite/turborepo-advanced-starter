export const PASSWORD_RESET_TOKEN_STORE = Symbol('PASSWORD_RESET_TOKEN_STORE');

export interface PasswordResetTokenStore {
  issue(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  consume(tokenHash: string, now: Date): Promise<string | null>;
}
