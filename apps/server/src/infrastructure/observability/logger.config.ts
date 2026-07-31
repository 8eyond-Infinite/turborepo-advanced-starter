const REDACTED_LOG_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'password',
  '*.password',
  'accessToken',
  '*.accessToken',
  'refreshToken',
  '*.refreshToken',
  'email',
  '*.email',
] as const;

export const createPinoHttpOptions = (
  environment: NodeJS.ProcessEnv = process.env,
) => ({
  level:
    environment.LOG_LEVEL ??
    (environment.NODE_ENV === 'production' ? 'info' : 'debug'),
  // RequestContextInterceptor owns the single request-completed event.
  autoLogging: false,
  redact: {
    paths: [...REDACTED_LOG_PATHS],
    censor: '[Redacted]',
  },
  transport:
    environment.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: { singleLine: true, translateTime: 'SYS:HH:MM:ss' },
        }
      : undefined,
});
