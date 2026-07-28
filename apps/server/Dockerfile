# syntax=docker/dockerfile:1
# Build from the repository root:
#   docker build -f apps/server/Dockerfile -t starter-api .

FROM node:20-alpine AS base
RUN corepack enable
ENV HUSKY=0
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

FROM base AS builder
RUN pnpm install --frozen-lockfile

COPY . .

# prisma generate only needs a syntactically valid URL at build time.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN pnpm --filter=@repo/database db:generate \
  && pnpm turbo run build --filter=server... \
  && pnpm --filter=server exec esbuild ../../packages/database/prisma/seed.ts \
    --bundle \
    --platform=node \
    --format=cjs \
    --target=node20 \
    --packages=external \
    --outfile=dist/seed.cjs

# Chỉ cài production dependencies của riêng server (và các package nó dùng).
# Không có devDependencies, không có deps của admin/client — bề mặt tấn công
# và kích thước image nhỏ đi đáng kể, trivy không còn quét thấy dev tooling.
# pnpm deploy dựng một thư mục tự chứa chỉ gồm server + workspace package nó
# dùng, kèm ĐÚNG dependencies production. Cách này loại sạch devDependencies
# và deps của app khác (admin/client) vốn bị hoist chung vào node_modules gốc —
# ít CVE bị quét thấy hơn và image nhỏ hơn.
FROM builder AS prod-deps
RUN pnpm --filter=server deploy --prod /prod/server
# Prisma client được sinh ra lúc build; deploy chỉ link lại package gốc nên
# phải mang phần đã generate sang.
RUN cp -r /app/node_modules/.prisma /prod/server/node_modules/.prisma

FROM node:20-alpine AS runner
ENV NODE_ENV=production
# Vá các package hệ điều hành của base image và gỡ npm/corepack —
# runtime chỉ cần binary node, npm đi kèm kéo theo CVE không liên quan.
RUN apk upgrade --no-cache \
  && rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app

# Thư mục deploy tự chứa package.json + node_modules (chỉ prod deps).
COPY --from=prod-deps /prod/server ./
# dist bị .gitignore nên pnpm deploy không mang theo — copy thẳng từ builder.
COPY --from=builder /app/apps/server/dist ./dist
# Local storage needs this directory to remain writable by the non-root runtime
# user. Multi-node production should use the S3 adapter instead.
COPY --chown=app:app --from=builder /app/apps/server/public ./public
# Migration is an explicit pre-deploy process, never part of API startup.
COPY --from=builder /app/apps/server/scripts ./scripts
COPY --from=builder /app/packages/database/prisma ./database/prisma
COPY --from=builder /app/packages/database/prisma.config.ts ./database/prisma.config.ts

USER app
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health/live || exit 1

# Worker dùng chung image này với entry khác:
#   docker run ... starter-api node dist/worker.js
CMD ["node", "dist/main.js"]
