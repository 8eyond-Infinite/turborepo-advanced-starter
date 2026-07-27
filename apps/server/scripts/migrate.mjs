import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

if (!process.env.DATABASE_URL?.trim()) {
  console.error('DATABASE_URL is required to run production migrations.');
  process.exit(1);
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const appDirectory = path.resolve(scriptDirectory, '..');
const prismaCli = path.join(
  appDirectory,
  'node_modules',
  'prisma',
  'build',
  'index.js',
);
const configPath = path.join(appDirectory, 'database', 'prisma.config.ts');

const result = spawnSync(
  process.execPath,
  [prismaCli, 'migrate', 'deploy', '--config', configPath],
  {
    cwd: path.join(appDirectory, 'database'),
    env: process.env,
    stdio: 'inherit',
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
