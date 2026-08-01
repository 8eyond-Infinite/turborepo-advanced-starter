import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const contracts = [
  {
    file: '.env.example',
    keys: ['DATABASE_URL', 'SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD'],
  },
  {
    file: 'apps/server/.env.example',
    keys: [
      'NODE_ENV',
      'PORT',
      'DATABASE_URL',
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
      'CORS_ORIGINS',
      'CLIENT_URL',
      'EMAIL_VERIFICATION_REQUIRED',
      'REFRESH_COOKIE_SAME_SITE',
      'METRICS_TOKEN',
      'MAIL_ENABLED',
    ],
  },
  {
    file: 'deploy/compose/.env.production.example',
    keys: [
      'SERVER_IMAGE',
      'SERVER_IMAGE_TAG',
      'DATABASE_URL',
      'REDIS_PASSWORD',
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
      'CORS_ORIGINS',
      'CLIENT_URL',
      'EMAIL_VERIFICATION_REQUIRED',
      'METRICS_TOKEN',
      'MAIL_ENABLED',
    ],
  },
  { file: 'apps/admin/.env.example', keys: ['VITE_API_URL'] },
  { file: 'apps/client/.env.example', keys: ['API_URL', 'SESSION_SECRET'] },
];
const keysFrom = (content) =>
  new Set(
    content
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Z][A-Z0-9_]*)\s*=/)?.[1])
      .filter(Boolean),
  );
const errors = [];
for (const contract of contracts) {
  try {
    const keys = keysFrom(readFileSync(resolve(root, contract.file), 'utf8'));
    for (const key of contract.keys)
      if (!keys.has(key)) errors.push(`${contract.file}: missing ${key}`);
  } catch {
    errors.push(`${contract.file}: file is missing or unreadable`);
  }
}
if (errors.length) {
  console.error('Environment contract validation failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(
  `Environment contract verified: ${contracts.length} example files.`,
);
