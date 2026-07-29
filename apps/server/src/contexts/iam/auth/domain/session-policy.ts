export const REFRESH_SESSION_ABSOLUTE_TTL_SECONDS = 7 * 24 * 60 * 60;

export const getRefreshSessionAbsoluteExpiry = (createdAt: string): string =>
  new Date(
    new Date(createdAt).getTime() + REFRESH_SESSION_ABSOLUTE_TTL_SECONDS * 1000,
  ).toISOString();

export const getRemainingSessionTtlSeconds = (
  absoluteExpiresAt: string,
  now = Date.now(),
): number => {
  const expiresAt = new Date(absoluteExpiresAt).getTime();
  if (!Number.isFinite(expiresAt)) return 0;
  return Math.max(0, Math.ceil((expiresAt - now) / 1000));
};
