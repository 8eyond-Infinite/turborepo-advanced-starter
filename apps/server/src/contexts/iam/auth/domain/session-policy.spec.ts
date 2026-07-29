import {
  getRefreshSessionAbsoluteExpiry,
  getRemainingSessionTtlSeconds,
  REFRESH_SESSION_ABSOLUTE_TTL_SECONDS,
} from './session-policy';

describe('refresh session policy', () => {
  it('sets one absolute seven-day lifetime from login time', () => {
    expect(getRefreshSessionAbsoluteExpiry('2026-07-29T00:00:00.000Z')).toBe(
      '2026-08-05T00:00:00.000Z',
    );
    expect(REFRESH_SESSION_ABSOLUTE_TTL_SECONDS).toBe(604800);
  });

  it('returns only the remaining lifetime and fails closed for invalid dates', () => {
    expect(
      getRemainingSessionTtlSeconds(
        '2026-07-29T01:00:00.000Z',
        new Date('2026-07-29T00:00:00.000Z').getTime(),
      ),
    ).toBe(3600);
    expect(getRemainingSessionTtlSeconds('invalid-date')).toBe(0);
  });
});
