# syntax=docker/dockerfile:1
# Build from the repository root:
# docker build -f apps/client/Dockerfile -t starter-client .

FROM node:20-alpine AS base
RUN corepack enable
ENV HUSKY=0
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/client/package.json apps/client/
COPY packages/contracts/package.json packages/contracts/
COPY packages/types/package.json packages/types/

FROM base AS builder
RUN pnpm install --frozen-lockfile
COPY . .
ENV NODE_ENV=production
RUN API_URL=https://api.build.example.invalid \
  SESSION_SECRET=build-only-session-secret-0123456789abcdef \
  pnpm turbo run build --filter=client...

FROM node:20-alpine AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN apk upgrade --no-cache \
  && rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
  && addgroup -S app \
  && adduser -S app -G app
WORKDIR /app

COPY --from=builder --chown=app:app /app/apps/client/.next/standalone ./
COPY --from=builder --chown=app:app /app/apps/client/.next/static ./apps/client/.next/static
COPY --from=builder --chown=app:app /app/apps/client/public ./apps/client/public

USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "apps/client/server.js"]
