import type { Response } from 'express';
import {
  clearRefreshCookie,
  REFRESH_COOKIE,
  setRefreshCookie,
} from './refresh-cookie';

describe('refresh cookie policy', () => {
  const originalEnvironment = process.env;

  beforeEach(() => {
    process.env = { ...originalEnvironment };
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it('uses a secure cross-site cookie only when explicitly configured', () => {
    process.env.NODE_ENV = 'production';
    process.env.REFRESH_COOKIE_SAME_SITE = 'none';
    const cookie = jest.fn();

    setRefreshCookie({ cookie } as unknown as Response, 'refresh-token');

    expect(cookie).toHaveBeenCalledWith(
      REFRESH_COOKIE,
      'refresh-token',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/auth',
      }),
    );
  });

  it('uses the same attributes when clearing a same-site cookie', () => {
    process.env.NODE_ENV = 'production';
    process.env.REFRESH_COOKIE_SAME_SITE = 'lax';
    const clearCookie = jest.fn();

    clearRefreshCookie({ clearCookie } as unknown as Response);

    expect(clearCookie).toHaveBeenCalledWith(
      REFRESH_COOKIE,
      expect.objectContaining({
        secure: true,
        sameSite: 'lax',
        path: '/auth',
      }),
    );
  });
});
