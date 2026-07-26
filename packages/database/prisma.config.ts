import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
    // Only needed by commands that replay the migration chain
    // (migrate diff --from-migrations, migrate dev). Point it at a disposable
    // database, e.g. postgresql://postgres:password@localhost:5433/starter_shadow
    ...(process.env.SHADOW_DATABASE_URL
      ? { shadowDatabaseUrl: env('SHADOW_DATABASE_URL') }
      : {}),
  },
});
