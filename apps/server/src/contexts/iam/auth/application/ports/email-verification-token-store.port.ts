export const EMAIL_VERIFICATION_TOKEN_STORE = Symbol(
  'EMAIL_VERIFICATION_TOKEN_STORE',
);

export interface EmailVerificationTokenStore {
  issue(
    userId: string,
    email: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void>;
  consume(
    tokenHash: string,
    now: Date,
  ): Promise<{ userId: string; email: string } | null>;
}
