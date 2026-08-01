const SUPPORTED_NODE_ENVIRONMENTS = [
  'development',
  'test',
  'production',
] as const;

type NodeEnvironment = (typeof SUPPORTED_NODE_ENVIRONMENTS)[number];
type RefreshCookieSameSite = 'lax' | 'none';
const SUPPORTED_NODE_ENVIRONMENT_SET = new Set<string>(
  SUPPORTED_NODE_ENVIRONMENTS,
);

export interface EnvironmentVariables extends Record<string, unknown> {
  NODE_ENV: NodeEnvironment;
  PORT: number;
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  CORS_ORIGINS: string;
  METRICS_TOKEN?: string;
  BACKUP_STATUS_FILE?: string;
  AUDIT_RETENTION_DAYS: number;
  REFRESH_COOKIE_SAME_SITE: RefreshCookieSameSite;
  MAIL_ENABLED: boolean;
  MAIL_HOST?: string;
  MAIL_PORT: number;
  MAIL_FROM?: string;
  CLIENT_URL: string;
  EMAIL_VERIFICATION_REQUIRED: boolean;
}

const requireString = (
  config: Record<string, unknown>,
  key: string,
): string => {
  const value = config[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value.trim();
};

const parsePort = (value: unknown): number => {
  const port = Number(value ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(
      'Environment variable PORT must be an integer from 1 to 65535',
    );
  }
  return port;
};

const parseBoolean = (value: unknown, key: string): boolean => {
  if (value === undefined || value === '') return false;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  throw new Error(`Environment variable ${key} must be true or false`);
};

const parseNonNegativeInteger = (
  value: unknown,
  key: string,
  defaultValue: number,
): number => {
  const parsed = Number(value ?? defaultValue);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(
      `Environment variable ${key} must be a non-negative integer`,
    );
  }
  return parsed;
};

export const validateEnvironment = (
  config: Record<string, unknown>,
): EnvironmentVariables => {
  const rawNodeEnvironment = config.NODE_ENV;
  const nodeEnvironment =
    typeof rawNodeEnvironment === 'string' ? rawNodeEnvironment : 'development';
  if (!SUPPORTED_NODE_ENVIRONMENT_SET.has(nodeEnvironment)) {
    throw new Error(
      `Environment variable NODE_ENV must be one of: ${SUPPORTED_NODE_ENVIRONMENTS.join(', ')}`,
    );
  }

  const accessSecret = requireString(config, 'JWT_ACCESS_SECRET');
  const refreshSecret = requireString(config, 'JWT_REFRESH_SECRET');
  const mailEnabled = parseBoolean(config.MAIL_ENABLED, 'MAIL_ENABLED');
  const mailHost =
    typeof config.MAIL_HOST === 'string' ? config.MAIL_HOST.trim() : '';
  const mailFrom =
    typeof config.MAIL_FROM === 'string' ? config.MAIL_FROM.trim() : '';
  if (mailEnabled && (!mailHost || !mailFrom)) {
    throw new Error(
      'Environment variables MAIL_HOST and MAIL_FROM are required when MAIL_ENABLED=true',
    );
  }
  const refreshCookieSameSite =
    typeof config.REFRESH_COOKIE_SAME_SITE === 'string'
      ? config.REFRESH_COOKIE_SAME_SITE.trim().toLowerCase()
      : 'lax';
  const metricsToken =
    typeof config.METRICS_TOKEN === 'string' ? config.METRICS_TOKEN.trim() : '';
  const backupStatusFile =
    typeof config.BACKUP_STATUS_FILE === 'string'
      ? config.BACKUP_STATUS_FILE.trim()
      : '';
  const clientUrl =
    typeof config.CLIENT_URL === 'string' && config.CLIENT_URL.trim()
      ? config.CLIENT_URL.trim()
      : 'http://localhost:3005';
  let parsedClientUrl: URL;
  try {
    parsedClientUrl = new URL(clientUrl);
  } catch {
    throw new Error('Environment variable CLIENT_URL must be a valid URL');
  }
  if (!['http:', 'https:'].includes(parsedClientUrl.protocol)) {
    throw new Error('Environment variable CLIENT_URL must use http or https');
  }
  const isLoopbackClient = ['localhost', '127.0.0.1', '::1'].includes(
    parsedClientUrl.hostname,
  );
  if (
    nodeEnvironment === 'production' &&
    parsedClientUrl.protocol !== 'https:' &&
    !isLoopbackClient
  ) {
    throw new Error(
      'Environment variable CLIENT_URL must use https in production',
    );
  }

  if (refreshCookieSameSite !== 'lax' && refreshCookieSameSite !== 'none') {
    throw new Error(
      'Environment variable REFRESH_COOKIE_SAME_SITE must be lax or none',
    );
  }

  if (
    nodeEnvironment === 'production' &&
    (accessSecret.length < 32 || refreshSecret.length < 32)
  ) {
    throw new Error(
      'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must contain at least 32 characters in production',
    );
  }

  if (nodeEnvironment === 'production' && metricsToken.length < 32) {
    throw new Error(
      'Environment variable METRICS_TOKEN must contain at least 32 characters in production',
    );
  }

  return {
    ...config,
    NODE_ENV: nodeEnvironment as NodeEnvironment,
    PORT: parsePort(config.PORT),
    DATABASE_URL: requireString(config, 'DATABASE_URL'),
    JWT_ACCESS_SECRET: accessSecret,
    JWT_REFRESH_SECRET: refreshSecret,
    METRICS_TOKEN: metricsToken || undefined,
    BACKUP_STATUS_FILE: backupStatusFile || undefined,
    AUDIT_RETENTION_DAYS: parseNonNegativeInteger(
      config.AUDIT_RETENTION_DAYS,
      'AUDIT_RETENTION_DAYS',
      0,
    ),
    REFRESH_COOKIE_SAME_SITE: refreshCookieSameSite,
    MAIL_ENABLED: mailEnabled,
    MAIL_HOST: mailHost || undefined,
    MAIL_PORT: parsePort(config.MAIL_PORT ?? 587),
    MAIL_FROM: mailFrom || undefined,
    CLIENT_URL: parsedClientUrl.origin,
    EMAIL_VERIFICATION_REQUIRED: parseBoolean(
      config.EMAIL_VERIFICATION_REQUIRED,
      'EMAIL_VERIFICATION_REQUIRED',
    ),
    CORS_ORIGINS:
      typeof config.CORS_ORIGINS === 'string' &&
      config.CORS_ORIGINS.trim().length > 0
        ? config.CORS_ORIGINS.trim()
        : 'http://localhost:3000,http://localhost:3002',
  };
};

export const parseCorsOrigins = (value: string): string[] =>
  value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
