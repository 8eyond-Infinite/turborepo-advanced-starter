# syntax=docker/dockerfile:1
# Build from the repository root:
#   docker build -f apps/server/Dockerfile -t starter-api .

FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app

# Manifests first so dependency install caches independently of source changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/server/package.json apps/server/
COPY apps/admin/package.json apps/admin/
COPY apps/client/package.json apps/client/
COPY packages/contracts/package.json packages/contracts/
COPY packages/database/package.json packages/database/
COPY packages/types/package.json packages/types/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/typescript-config/package.json packages/typescript-config/
RUN pnpm install --frozen-lockfile

COPY . .

# prisma generate only needs a syntactically valid URL at build time.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN pnpm --filter=@repo/database db:generate \
  && pnpm turbo run build --filter=server...

FROM node:20-alpine AS runner
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/server/package.json ./apps/server/
# Với node-linker=hoisted, các link @repo/* nằm trong node_modules CỦA app
# (trỏ về ../../packages) chứ không nằm ở node_modules gốc.
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/public ./apps/server/public

USER app
WORKDIR /app/apps/server
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health/live || exit 1

# Worker dùng chung image này với entry khác:
#   docker run ... starter-api node dist/worker.js
CMD ["node", "dist/main.js"]
