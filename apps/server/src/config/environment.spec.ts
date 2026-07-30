import { parseCorsOrigins, validateEnvironment } from './environment';

describe('environment configuration', () => {
  const validConfig = {
    NODE_ENV: 'test',
    PORT: '3001',
    DATABASE_URL: 'postgresql://localhost/database_test',
    JWT_ACCESS_SECRET: 'access-secret',
    JWT_REFRESH_SECRET: 'refresh-secret',
  };

  it('normalizes valid environment variables', () => {
    expect(validateEnvironment(validConfig)).toEqual(
      expect.objectContaining({
        NODE_ENV: 'test',
        PORT: 3001,
        DATABASE_URL: validConfig.DATABASE_URL,
        REFRESH_COOKIE_SAME_SITE: 'lax',
        MAIL_ENABLED: false,
      }),
    );
  });

  it.each([
    ['DATABASE_URL', ''],
    ['JWT_ACCESS_SECRET', ''],
    ['JWT_REFRESH_SECRET', ''],
  ])('rejects a missing required variable: %s', (key, value) => {
    expect(() => validateEnvironment({ ...validConfig, [key]: value })).toThrow(
      `Environment variable ${key} is required`,
    );
  });

  it('rejects invalid ports', () => {
    expect(() =>
      validateEnvironment({ ...validConfig, PORT: '70000' }),
    ).toThrow('Environment variable PORT');
  });

  it('requires strong JWT secrets in production', () => {
    expect(() =>
      validateEnvironment({ ...validConfig, NODE_ENV: 'production' }),
    ).toThrow('at least 32 characters');
  });

  it('rejects an unsupported refresh cookie policy', () => {
    expect(() =>
      validateEnvironment({
        ...validConfig,
        REFRESH_COOKIE_SAME_SITE: 'strict',
      }),
    ).toThrow('REFRESH_COOKIE_SAME_SITE must be lax or none');
  });

  it('requires SMTP settings only when mail delivery is enabled', () => {
    expect(() =>
      validateEnvironment({ ...validConfig, MAIL_ENABLED: 'true' }),
    ).toThrow('MAIL_HOST and MAIL_FROM are required');

    expect(
      validateEnvironment({
        ...validConfig,
        MAIL_ENABLED: 'true',
        MAIL_HOST: 'smtp.example.com',
        MAIL_FROM: 'no-reply@example.com',
      }),
    ).toEqual(expect.objectContaining({ MAIL_ENABLED: true }));
  });

  it('rejects an invalid mail feature flag', () => {
    expect(() =>
      validateEnvironment({ ...validConfig, MAIL_ENABLED: 'yes' }),
    ).toThrow('MAIL_ENABLED must be true or false');
  });

  it('parses a CORS allowlist', () => {
    expect(
      parseCorsOrigins('https://admin.example.com, https://app.example.com'),
    ).toEqual(['https://admin.example.com', 'https://app.example.com']);
  });
});
