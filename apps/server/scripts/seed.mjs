import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const requiredVariables = [
  'DATABASE_URL',
  'SEED_ADMIN_EMAIL',
  'SEED_ADMIN_PASSWORD',
];
const missingVariables = requiredVariables.filter(
  (key) => !process.env[key]?.trim(),
);

if (missingVariables.length > 0) {
  console.error(
    `Missing variables required for admin bootstrap: ${missingVariables.join(', ')}.`,
  );
  process.exit(1);
}

if ((process.env.SEED_ADMIN_PASSWORD?.length ?? 0) < 12) {
  console.error('SEED_ADMIN_PASSWORD must contain at least 12 characters.');
  process.exit(1);
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const appDirectory = path.resolve(scriptDirectory, '..');
const seedBundle = path.join(appDirectory, 'dist', 'seed.cjs');

const result = spawnSync(process.execPath, [seedBundle], {
  cwd: appDirectory,
  env: process.env,
  stdio: 'inherit',
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
