import { spawnSync } from 'node:child_process';

const E2E_DATABASE = 'admin_browser_e2e';
const pnpm = 'pnpm';
const pnpmOptions = process.platform === 'win32' ? { shell: true } : {};

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    ...options,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed (${result.status})`);
  }
};

console.log('Starting isolated frontend E2E infrastructure...');
// `up -d` only means the container process started. `--wait` blocks until the
// declared healthchecks pass, otherwise a cold Docker Desktop start can race
// the first dropdb/Redis request.
run('docker', [
  'compose',
  'up',
  '-d',
  '--wait',
  '--wait-timeout',
  '60',
  'postgres',
  'redis',
]);

// This database is intentionally disposable and never shares data with
// starter_db. Recreate it on every run so tests cannot depend on old rows,
// sessions or outbox events.
run('docker', [
  'compose',
  'exec',
  '-T',
  'postgres',
  'dropdb',
  '--if-exists',
  '--force',
  '-U',
  'postgres',
  E2E_DATABASE,
]);
run('docker', [
  'compose',
  'exec',
  '-T',
  'postgres',
  'createdb',
  '-U',
  'postgres',
  E2E_DATABASE,
]);

const withE2eEnvironment = [
  'exec',
  'dotenv',
  '-e',
  'apps/server/.env.e2e',
  '--',
  pnpm,
  '--filter=@repo/database',
];

run(pnpm, [...withE2eEnvironment, 'db:deploy'], pnpmOptions);
run(pnpm, [...withE2eEnvironment, 'db:seed'], pnpmOptions);

console.log('Frontend E2E database is migrated and seeded.');
