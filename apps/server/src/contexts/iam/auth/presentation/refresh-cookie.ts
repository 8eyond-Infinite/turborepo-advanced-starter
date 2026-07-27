import type { Request, Response } from 'express';

// Refresh token nằm trong HttpOnly cookie: JavaScript phía trình duyệt không
// đọc được, nên XSS không thể đánh cắp credential sống 7 ngày. Cookie giới
// hạn path /auth — trình duyệt chỉ gửi kèm khi gọi các endpoint auth.
export const REFRESH_COOKIE = 'refresh_token';

const COOKIE_PATH = '/auth';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const baseOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite:
    process.env.REFRESH_COOKIE_SAME_SITE === 'none'
      ? ('none' as const)
      : ('lax' as const),
  path: COOKIE_PATH,
});

export const setRefreshCookie = (res: Response, token: string): void => {
  res.cookie(REFRESH_COOKIE, token, {
    ...baseOptions(),
    maxAge: SEVEN_DAYS_MS,
  });
};

export const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(REFRESH_COOKIE, baseOptions());
};

export const refreshTokenFromCookie = (req: Request): string | null => {
  const cookies = req.cookies as Record<string, string> | undefined;
  const parsed = cookies?.[REFRESH_COOKIE];
  if (parsed) {
    return parsed;
  }

  // Tự đọc header Cookie khi cookie-parser chưa được đăng ký (ví dụ app
  // dựng trong test) — extractor không phụ thuộc thứ tự middleware.
  const header = req.headers.cookie;
  if (!header) {
    return null;
  }
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === REFRESH_COOKIE && rest.length > 0) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
};
