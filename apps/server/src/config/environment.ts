const SUPPORTED_NODE_ENVIRONMENTS = [
  'development',
  'test',
  'production',
] as const;

type NodeEnvironment = (typeof SUPPORTED_NODE_ENVIRONMENTS)[number];
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

  if (
    nodeEnvironment === 'production' &&
    (accessSecret.length < 32 || refreshSecret.length < 32)
  ) {
    throw new Error(
      'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must contain at least 32 characters in production',
    );
  }

  return {
    ...config,
    NODE_ENV: nodeEnvironment as NodeEnvironment,
    PORT: parsePort(config.PORT),
    DATABASE_URL: requireString(config, 'DATABASE_URL'),
    JWT_ACCESS_SECRET: accessSecret,
    JWT_REFRESH_SECRET: refreshSecret,
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
