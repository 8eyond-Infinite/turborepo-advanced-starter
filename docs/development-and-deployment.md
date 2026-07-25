# Phát triển, Docker và triển khai

Tài liệu này quy định cách chạy monorepo trong local, CI và production. Mục tiêu là tránh trộn host development với container development, tránh hai package manager cùng sở hữu `node_modules` và giữ migration/database lifecycle có thể kiểm soát.

## 1. Nguyên tắc nền tảng

Một môi trường phải có đúng một bên sở hữu dependency tree:

```text
Host development
  → pnpm trên host sở hữu toàn bộ node_modules

Container development
  → pnpm trong container sở hữu toàn bộ node_modules volume

Production image
  → dependency được cài lúc image build
```

Không cho Linux container ghi symlink vào Windows workspace rồi dùng cùng workspace bằng pnpm trên Windows.

## 2. Workflow local được khuyến nghị

Application chạy trên host; infrastructure chạy bằng Docker.

```text
Windows host
├── NestJS server
├── React Admin
├── Next.js Client
└── pnpm workspace/node_modules

Docker Desktop
├── PostgreSQL
├── Redis
└── Maildev
```

Workflow này phù hợp nhất cho repository đặt trên `D:\...` vì file watching, IDE resolution và debugging đều dùng filesystem Windows.

### Khởi tạo

```powershell
corepack enable
pnpm install --frozen-lockfile
```

pnpm được pin ở root `package.json`. Không tự ý nâng major pnpm trong một lần thay đổi không liên quan.

### Khởi động infrastructure

Compose hiện còn service `api` không có profile. Vì vậy phải chỉ định service:

```powershell
docker compose up -d postgres redis maildev
```

Kiểm tra:

```powershell
docker compose ps
```

API container `starter-api-dev` không được chạy khi server chạy trên host.

### Khởi động application

```powershell
pnpm dev
```

Hoặc chạy riêng:

```powershell
pnpm dev:server
pnpm dev:admin
pnpm dev:client
```

### Dừng

`Ctrl+C` dừng application host.

```powershell
docker compose stop postgres redis maildev
```

`docker compose down` xóa container/network nhưng giữ named volume. `docker compose down --volumes` xóa dữ liệu PostgreSQL/Redis và là thao tác destructive.

## 3. Port map local

| Service    |        Host port |      Container/internal port |
| ---------- | ---------------: | ---------------------------: |
| Server     | 3001 theo `.env` | không áp dụng trong host-dev |
| Admin      |             5173 |                không áp dụng |
| Client     |             3005 |                không áp dụng |
| PostgreSQL |             5433 |                         5432 |
| Redis      |             6380 |                         6379 |
| Maildev UI |             1083 |                         1080 |
| SMTP       |             1025 |                         1025 |

`docker-compose.yml` hiện map API container `3002:3002`, nhưng server `.env.example` mặc định `PORT=3001`. Đây là configuration drift và là lý do không dùng API container hiện tại làm workflow chuẩn.

## 4. Environment files

Root `.env` được root Prisma scripts đọc qua `dotenv-cli`. `apps/server/.env` được NestJS và Docker API service đọc.

Local host configuration:

```dotenv
PORT=3001
DATABASE_URL=postgresql://postgres:password@localhost:5433/starter_db?schema=public
DIRECT_URL=postgresql://postgres:password@localhost:5433/starter_db?schema=public
REDIS_HOST=localhost
REDIS_PORT=6380
CORS_ORIGINS=http://localhost:5173,http://localhost:3005
```

Container configuration dùng DNS service:

```dotenv
DATABASE_URL=postgresql://postgres:password@postgres:5432/starter_db?schema=public
REDIS_HOST=redis
REDIS_PORT=6379
```

Không dùng `localhost` từ bên trong API container để gọi PostgreSQL container.

Secret thật không commit. `.env.example` chỉ chứa placeholder an toàn và phải được cập nhật khi thêm required variable.

## 5. Prisma workflow

### Generate client

```powershell
pnpm db:generate
```

Generate không sửa database.

### Tạo migration trong development

```powershell
pnpm db:migrate
```

Flow:

```text
edit schema.prisma
→ migrate dev
→ review generated migration.sql
→ run tests
→ commit schema + migration
```

Không sửa migration đã được dùng bởi môi trường khác.

### Seed

```powershell
pnpm db:seed
```

Seed cần idempotent hoặc chỉ dùng database đã reset rõ ràng.

### `db push`

`pnpm db:push` đồng bộ schema không có migration history. Chỉ dùng cho disposable prototype/test database. Không dùng cho staging/production.

Database local hiện tại đã từng dùng `db push`, được xác nhận bởi việc có schema nhưng không có bảng `_prisma_migrations`. Để chuyển sang migration governance sạch, chọn một trong hai:

1. reset local volume rồi apply toàn bộ migration;
2. baseline database có chủ đích nếu phải giữ dữ liệu.

Không giả vờ database đã được migrate chỉ vì schema hiện tại trùng.

### Deployment migration

Production/staging dùng:

```bash
prisma migrate deploy
```

Nên chạy như release job trước rollout application. Không để mọi API replica tự tạo migration khi boot.

## 6. Vấn đề Docker Compose hiện tại

Service `api` đang:

- bind mount toàn repository vào `/app`;
- chạy `pnpm install` mỗi lần start;
- tạo anonymous volume cho một số `node_modules`;
- thiếu volume cho `packages/types` và `packages/contracts`;
- chạy watch mode;
- chưa được đặt trong profile.

Trên Windows, container đã tạo Linux reparse/symlink trong:

```text
packages/types/node_modules
packages/contracts/node_modules
```

Sau đó host `pnpm install` gặp `EACCES`, package build không resolve được `@repo/typescript-config/base.json`, và Turbo terminate toàn bộ task graph.

### Khôi phục workspace bị lỗi

Đầu tiên:

```powershell
docker compose stop api
```

Xác nhận hai target nằm đúng trong repository, sau đó xóa:

```powershell
Remove-Item -LiteralPath ".\packages\types\node_modules" -Recurse -Force
Remove-Item -LiteralPath ".\packages\contracts\node_modules" -Recurse -Force
pnpm install --frozen-lockfile
```

Nếu file đang bị khóa, đóng IDE/terminal/container giữ handle rồi thử lại. Không xóa root hoặc dùng biến/glob không kiểm tra.

## 7. Compose mục tiêu

Compose mặc định chỉ chứa infrastructure. Application container nằm trong profile `container-dev`.

```yaml
services:
  postgres:
    image: postgres:16-alpine

  redis:
    image: redis:7-alpine

  maildev:
    image: maildev/maildev:2.1.0

  api:
    profiles: ["container-dev"]
    build:
      context: .
      dockerfile: apps/server/Dockerfile.dev
```

Host workflow:

```bash
docker compose up -d
pnpm dev
```

Container-dev workflow:

```bash
docker compose --profile container-dev up api
```

Khi dùng bind mount, khai báo named volume cho mọi workspace `node_modules`, bao gồm `contracts` và `types`. Không dùng cùng workspace bằng host pnpm trong lúc container-dev đang sở hữu dependency tree.

Nếu team muốn full-container development thường xuyên trên Windows, đặt repository trong WSL2 filesystem thay vì ổ `D:` bind mount sang Linux.

## 8. Prisma adapter hiện tại

`PrismaService` đang tạo `pg.Pool` rồi truyền Pool vào `PrismaPg`. Với Prisma 7.8, bản tái hiện trong chính container trả:

```text
PrismaClientKnownRequestError
code: ECONNREFUSED
modelName: OutboxEvent
```

Cách khởi tạo mục tiêu:

```ts
const adapter = new PrismaPg({ connectionString });
super({ adapter });
```

Sau đó `$disconnect()` quản lý adapter lifecycle; không tạo một external pool không cần thiết.

Lỗi này giải thích outbox polling failure nhưng độc lập với migration và Windows `node_modules`.

## 9. Outbox operation

Outbox poll mặc định 100 ms. Khi database/adapter lỗi, publisher hiện log mỗi poll nên có thể tạo khoảng 10 error/giây.

Production-ready behavior cần:

- exponential backoff cho infrastructure error;
- reset delay sau lần poll thành công;
- log `name`, `code`, `message`, `meta`;
- metric pending/processing/failed count;
- metric oldest pending age;
- alert khi `FAILED` hoặc lag vượt threshold.

Backoff không thay thế sửa kết nối; nó bảo vệ log và database trong thời gian failure.

## 10. Container development

Container development phải dùng Dockerfile riêng:

```dockerfile
FROM node:20-alpine
WORKDIR /app
RUN corepack enable
CMD ["pnpm", "--filter=server", "dev"]
```

Dependency initialization không nên ẩn trong command start. Nếu cần bootstrap:

```bash
pnpm install --frozen-lockfile
pnpm db:generate
```

Container dev có thể bind source và chạy watch. Nó không được dùng làm production image.

## 11. Production image

Production image là immutable artifact:

```text
copy manifests
→ install frozen lockfile
→ copy source
→ generate client
→ build
→ prune/copy runtime artifacts
→ run compiled output
```

Nó không:

- bind mount source;
- chạy `pnpm install` lúc start;
- chạy `nest start --watch`;
- chứa Maildev;
- chứa development database password;
- chạy schema push.

Nên dùng multi-stage Dockerfile và non-root runtime user.

## 12. Production topology

Mục tiêu:

```mermaid
flowchart LR
    LB[Load balancer] --> API1[API replica]
    LB --> API2[API replica]
    CDN[CDN/static host] --> Admin[Admin assets]
    LB --> Next[Next.js runtime]
    API1 --> PG[(Managed PostgreSQL)]
    API2 --> PG
    API1 --> Redis[(Managed Redis)]
    API2 --> Redis
    API1 --> Storage[(Object storage)]
    API2 --> Storage
```

Không đặt PostgreSQL production cùng lifecycle với API container nếu dữ liệu quan trọng. Dùng managed service hoặc hạ tầng có backup, replication và monitoring rõ.

Admin Vite build là static assets và có thể phục vụ qua CDN/static host. Next.js cần Node runtime nếu dùng dynamic rendering; có thể static export chỉ khi product behavior cho phép.

## 13. CI pipeline

Pipeline đề xuất:

```text
checkout
→ setup pinned Node + pnpm
→ pnpm install --frozen-lockfile
→ prisma generate
→ lint
→ typecheck
→ unit tests
→ start PostgreSQL/Redis service containers
→ apply migrations to test database
→ backend E2E
→ production builds
→ build container images
→ vulnerability/SBOM scan
→ publish immutable images
```

Test database phải có tên/scope riêng. Backend E2E đã có guard từ chối reset database không có hậu tố `_test`.

## 14. Release flow

```text
merge reviewed change
→ CI produces versioned image
→ deploy migration job
→ deploy application
→ health/readiness passes
→ smoke tests
→ monitor errors, outbox lag, queue and latency
```

Rollback application dùng image version trước. Rollback database không mặc định chạy down migration; schema change phải backward-compatible qua expand/contract khi cần zero downtime.

## 15. Health và shutdown

API bật Nest shutdown hooks. Adapter, queue, Redis và outbox poller phải dừng nhận việc mới, chờ active work trong giới hạn và đóng connection.

Health endpoint nên phân biệt:

- liveness: process còn sống;
- readiness: instance sẵn sàng nhận traffic;
- dependency detail: database/Redis status cho vận hành nhưng không lộ secret.

## 16. Backup và dữ liệu

Named volume local không phải backup. Production PostgreSQL cần:

- automated backup;
- point-in-time recovery nếu yêu cầu;
- restore drill;
- retention policy;
- encryption và access control.

Redis session/cache có thể tái tạo một phần, nhưng queue durability và session impact khi mất Redis phải được hiểu rõ.

## 17. Checklist hằng ngày

Trước khi chạy:

```text
Docker API container đã dừng?
PostgreSQL/Redis/Maildev đã healthy?
.env trỏ host ports 5433/6380?
pnpm install đã hoàn chỉnh?
```

Trước khi commit:

```text
lint pass
typecheck pass
unit tests pass
build pass
migration được review
tài liệu cập nhật nếu flow thay đổi
không commit generated temp file hoặc secret
```

Trước khi deploy:

```text
image immutable
migrate deploy đã được kiểm soát
health check tồn tại
rollback version rõ
observability và alert sẵn sàng
```
