# Phát triển, Docker và triển khai

Tài liệu này quy định cách chạy monorepo trong local, CI và production. Mục tiêu là tránh trộn lẫn hai kiểu phát triển (chạy trên máy host và chạy trong container), tránh để hai phía cùng cài đặt và ghi vào chung một `node_modules`, và giữ cho vòng đời của migration/database luôn kiểm soát được.

## 1. Nguyên tắc nền tảng

Trong một môi trường, phải có đúng một bên chịu trách nhiệm cài và sở hữu toàn bộ cây dependency:

```text
Host development
  → pnpm trên host sở hữu toàn bộ node_modules

Container development
  → pnpm trong container sở hữu toàn bộ node_modules volume

Production image
  → dependency được cài lúc image build
```

Không để container Linux ghi symlink vào workspace trên Windows, rồi lại chạy pnpm của Windows trên chính workspace đó — hai bên sẽ phá cấu trúc thư mục của nhau.

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

Workflow này phù hợp nhất cho repository đặt trên `D:\...` vì việc theo dõi thay đổi file (file watching), việc IDE tìm và phân giải module, và việc debug đều chạy trực tiếp trên filesystem Windows.

### Khởi tạo

```powershell
corepack enable
pnpm install --frozen-lockfile
```

pnpm được pin ở root `package.json`. Không tự ý nâng major pnpm trong một lần thay đổi không liên quan.

### Khởi động infrastructure

Service `api` nằm sau profile `container-dev`, nên khởi động mặc định chỉ chạy infrastructure:

```powershell
docker compose up -d
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

Queue worker (gửi email nền) là một process tách khỏi API. Khi cần thấy email được gửi thật trong lúc phát triển, mở thêm một terminal:

```powershell
pnpm --filter=server dev:worker
```

Không chạy worker thì hệ thống vẫn hoạt động bình thường — job nằm chờ trong queue (Redis) và được xử lý ngay khi worker bật lên. Ở production, worker chạy bằng `node dist/worker.js` từ cùng image với API.

### Dừng

`Ctrl+C` dừng application host.

```powershell
docker compose stop postgres redis maildev
```

`docker compose down` xóa container/network nhưng giữ lại named volume (nơi dữ liệu nằm). `docker compose down --volumes` xóa luôn dữ liệu PostgreSQL/Redis — thao tác này phá hủy dữ liệu, không lấy lại được.

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

`docker-compose.yml` hiện map API container `3002:3002`, nhưng server `.env.example` mặc định `PORT=3001`. Hai nơi cấu hình đang lệch nhau (configuration drift) — đây là lý do không dùng API container hiện tại làm workflow chuẩn.

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

Secret thật không bao giờ được commit. `.env.example` chỉ chứa giá trị giữ chỗ an toàn (placeholder) và phải được cập nhật mỗi khi thêm biến bắt buộc mới.

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

Script seed phải idempotent (chạy lại nhiều lần không làm hỏng dữ liệu), hoặc chỉ được chạy trên database vừa reset một cách rõ ràng.

### `db push`

`pnpm db:push` ép database khớp schema hiện tại mà không ghi lại lịch sử migration. Chỉ dùng cho database prototype/test kiểu dùng xong bỏ. Không dùng cho staging/production.

Migration chain đã được đối chiếu với schema bằng `prisma migrate diff --from-migrations` và tái tạo đầy đủ schema trên database sạch (migration `20260726073000_add_user_profile_menus_and_notifications` đóng phần drift từng tồn tại: `users.username`, `users.avatar`, bảng `menus` và `notifications`). Database dev local đã được baseline bằng `prisma migrate resolve --applied` cho toàn bộ chain; `prisma migrate status` phải trả "up to date".

Lệnh cần replay migration chain (`migrate diff --from-migrations`, `migrate dev`) yêu cầu `SHADOW_DATABASE_URL` trỏ tới một database dùng xong bỏ, ví dụ `postgresql://postgres:password@localhost:5433/starter_shadow`.

Không giả vờ database đã được migrate chỉ vì schema hiện tại trùng — môi trường mới phải dựng bằng `prisma migrate deploy`, không phải `db push`.

### Deployment migration

Production/staging dùng:

```bash
prisma migrate deploy
```

Nên chạy lệnh này như một bước riêng trong đợt phát hành (release job), trước khi triển khai bản ứng dụng mới. Không để mọi bản sao API (replica) tự chạy migration lúc khởi động — nhiều bản cùng chạy sẽ giẫm lên nhau.

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

Sau đó `pnpm install` trên host gặp lỗi `EACCES`, bước build của package không tìm được `@repo/typescript-config/base.json`, và Turbo hủy toàn bộ chuỗi task đang chạy.

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
    profiles: ['container-dev']
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

Khi dùng bind mount, khai báo named volume cho mọi thư mục `node_modules` trong workspace, bao gồm cả `contracts` và `types`. Trong lúc container-dev đang là bên sở hữu cây dependency, không chạy pnpm trên host vào cùng workspace đó.

Nếu team muốn full-container development thường xuyên trên Windows, đặt repository trong WSL2 filesystem thay vì ổ `D:` bind mount sang Linux.

## 8. Prisma adapter

`PrismaService` và seed script khởi tạo adapter bằng `new PrismaPg({ connectionString })` và để `$disconnect()` tự quản lý vòng đời của pool kết nối. Không truyền external `pg.Pool` vào `PrismaPg` — cách đó từng được chẩn đoán gây `PrismaClientKnownRequestError / ECONNREFUSED` trên Prisma 7.8.

## 9. Outbox operation

Publisher quét bảng outbox (poll) mỗi 100 ms theo mặc định. Khi database hoặc adapter lỗi, mỗi lần quét đều ghi một dòng log lỗi, nên có thể sinh ra khoảng 10 error/giây.

Để sẵn sàng cho production, hệ thống cần:

- khi hạ tầng lỗi, giãn dần thời gian giữa các lần thử (exponential backoff);
- sau lần quét thành công, đưa thời gian chờ về mức bình thường;
- log đủ `name`, `code`, `message`, `meta` của lỗi;
- số liệu theo dõi (metric) đếm event đang chờ/đang xử lý/thất bại;
- số liệu về tuổi của event chờ lâu nhất;
- cảnh báo khi có event `FAILED` hoặc độ trễ vượt ngưỡng.

Backoff không thay cho việc sửa nguyên nhân mất kết nối; nó chỉ giúp log và database không bị dội liên tục trong lúc sự cố còn diễn ra.

## 10. Container development

Container development phải dùng Dockerfile riêng:

```dockerfile
FROM node:20-alpine
WORKDIR /app
RUN corepack enable
CMD ["pnpm", "--filter=server", "dev"]
```

Việc cài dependency ban đầu không nên giấu bên trong lệnh khởi động container. Nếu cần chuẩn bị lần đầu:

```bash
pnpm install --frozen-lockfile
pnpm db:generate
```

Container dev có thể mount source từ máy ngoài vào (bind mount) và chạy chế độ theo dõi file (watch). Nhưng không được lấy nó làm image cho production.

## 11. Production image

Production image là một sản phẩm build bất biến (immutable) — build xong là đóng băng, lúc chạy không sửa gì thêm:

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

- mount source từ máy ngoài vào (bind mount);
- chạy `pnpm install` lúc khởi động;
- chạy `nest start --watch`;
- chứa Maildev;
- chứa password database của môi trường development;
- chạy schema push.

Nên build bằng Dockerfile nhiều giai đoạn (multi-stage) và chạy container bằng user không có quyền root.

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

Nếu dữ liệu quan trọng, đừng để PostgreSQL production sống chết cùng vòng đời của container API — container bị xóa là mất luôn dữ liệu. Dùng dịch vụ do nhà cung cấp quản lý (managed service) hoặc hạ tầng có sao lưu, nhân bản (replication) và giám sát rõ ràng.

Bản build Vite của Admin chỉ là các file tĩnh, có thể phục vụ qua CDN hoặc static host. Next.js cần một tiến trình Node đang chạy nếu dùng render động (dynamic rendering); chỉ xuất ra file tĩnh (static export) được khi hành vi của sản phẩm cho phép.

## 13. CI pipeline

CI chạy trên GitHub Actions với hai workflow đã triển khai:

- `.github/workflows/ci.yml` — job `quality` (install frozen → prisma generate → lint với `--max-warnings=0` → check-types → unit tests → build) và job `e2e` (PostgreSQL/Redis/Maildev service containers, sinh `apps/server/.env.test` với database `starter_test`, chạy `pnpm --filter=server test:e2e`).
- `.github/workflows/security.yml` — gitleaks secret scan (full history) và `pnpm audit --prod --audit-level=high`, chạy trên push/PR và theo lịch hàng tuần.

Node được pin qua `.nvmrc`, pnpm qua trường `packageManager`. Dependabot cập nhật npm dependencies và GitHub Actions hàng tuần (`.github/dependabot.yml`). Local có husky pre-commit (lint-staged + prettier) và commit-msg (commitlint, conventional commits).

Job `image` hoàn tất chuỗi cung ứng: build Docker image của server từ `apps/server/Dockerfile`, sinh danh mục thành phần (SBOM — bản kê mọi package có trong image, định dạng SPDX, đính kèm như artifact của run), quét lỗ hổng image bằng trivy (fail ở mức HIGH/CRITICAL, bỏ qua lỗ hổng chưa có bản vá), và chỉ khi merge vào `main` mới đẩy image bất biến lên GitHub Container Registry với hai tag: SHA của commit và `latest`. Job này khai báo `needs` cả quality lẫn e2e — image không bao giờ được phát hành từ code chưa qua gate. Chạy worker từ cùng image bằng lệnh `node dist/worker.js`.

Database dùng cho test phải có tên/phạm vi riêng; backend E2E đã có chốt chặn từ chối reset bất kỳ database nào không có hậu tố `_test`.

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

Muốn quay lui (rollback) ứng dụng thì triển khai lại image của phiên bản trước. Với database thì không mặc định chạy migration lùi (down migration); thay vào đó, khi cần triển khai không gián đoạn (zero downtime), thay đổi schema phải tương thích ngược theo kiểu expand/contract — thêm cái mới trước, chuyển dần, rồi mới bỏ cái cũ.

## 15. Health và shutdown

API bật Nest shutdown hooks. Khi được lệnh tắt, adapter, queue, Redis và outbox poller phải ngừng nhận việc mới, chờ các việc đang làm dở trong một giới hạn thời gian, rồi đóng kết nối.

Health endpoint nên phân biệt:

- liveness: process còn sống hay không;
- readiness: instance đã sẵn sàng nhận traffic hay chưa;
- dependency detail: trạng thái database/Redis cho người vận hành xem, nhưng không để lộ secret.

## 16. Backup và dữ liệu

Named volume trên máy local không phải là bản sao lưu. PostgreSQL production cần:

- sao lưu tự động;
- khôi phục về đúng một thời điểm (point-in-time recovery) nếu có yêu cầu;
- diễn tập khôi phục (restore drill) để chắc rằng bản sao lưu dùng được thật;
- chính sách thời gian lưu giữ bản sao lưu (retention);
- mã hóa và kiểm soát truy cập.

Session/cache trong Redis có thể dựng lại được một phần, nhưng phải hiểu rõ hai điều khi mất Redis: queue còn giữ được việc đang chờ hay không, và các phiên đăng nhập bị ảnh hưởng thế nào.

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
