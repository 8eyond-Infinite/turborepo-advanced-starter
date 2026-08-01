# Phát triển, Docker và triển khai

> **Phần IV · Chương 14 — Từ source code đến process đang chạy**
>
> Chương trước: [Audit context](../apps/server/src/contexts/audit/README.md) · [Mục lục handbook](README.md) · Chương sau: [Deployment không phụ thuộc nhà cung cấp](provider-neutral-deployment.md)

Chương này phân biệt hai cách chạy thường bị trộn với nhau. Khi lập trình, ta muốn sửa code và thấy kết quả ngay. Khi triển khai, ta muốn cùng một bản build chạy lặp lại và không phụ thuộc trạng thái máy của lập trình viên.

Với mỗi cách chạy, hãy hỏi hai câu: chương trình đang chạy trực tiếp trên Windows/WSL hay trong container, và dependency cùng dữ liệu của nó nằm ở đâu? Trả lời sai một trong hai câu thường dẫn tới lỗi `node_modules`, sai hostname database hoặc Docker chiếm dung lượng ngoài dự kiến.

Ta bắt đầu bằng cách chạy hằng ngày: application chạy trực tiếp trên máy để IDE và tự reload code hoạt động nhanh; PostgreSQL, Redis và Maildev chạy trong Docker. Sau đó ta theo cùng source code qua quá trình build image, cập nhật cấu trúc database, kiểm tra sức khỏe và triển khai.

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
CLIENT_URL=http://localhost:3005
EMAIL_VERIFICATION_REQUIRED=false
```

`CLIENT_URL` không phải CORS allowlist. Nó là origin backend dùng để tạo link password reset và xác minh email. Local trỏ `http://localhost:3005`; môi trường public phải trỏ đúng Client HTTPS, không có path.

`EMAIL_VERIFICATION_REQUIRED=false` cho phép starter chạy khi chưa có SMTP. Đặt `true` khi sản phẩm yêu cầu chứng minh quyền sở hữu email. Khi bật ở môi trường thật, đồng thời phải bật và thử cấu hình mail; nếu không, user mới sẽ được tạo nhưng không thể nhận liên kết để đăng nhập.

Container configuration dùng DNS service:

```dotenv
DATABASE_URL=postgresql://postgres:password@postgres:5432/starter_db?schema=public
REDIS_HOST=redis
REDIS_PORT=6379
```

Không dùng `localhost` từ bên trong API container để gọi PostgreSQL container.

Secret thật không bao giờ được commit. `.env.example` chỉ chứa giá trị giữ chỗ an toàn (placeholder) và phải được cập nhật mỗi khi thêm biến bắt buộc mới.

`apps/server/.env.e2e` là ngoại lệ có chủ đích: file này chỉ chứa secret test local cố định, trỏ duy nhất tới database disposable `admin_browser_e2e` và không được dùng ngoài test. Chạy Admin browser E2E bằng:

```powershell
pnpm --filter=admin exec playwright install chromium # chỉ cần lần đầu
pnpm e2e:admin
```

`e2e:frontend:prepare` bật Postgres và Redis bằng `docker compose up --wait`. Script chỉ đi tiếp khi cả hai healthcheck thành công. Sau đó nó xóa rồi tạo lại đúng database dùng cho browser test là `admin_browser_e2e`, chạy migration và tạo admin test. Cả `e2e:admin` lẫn `e2e:client` đều tự gọi bước chuẩn bị này trước khi mở Chromium.

Không thay `up --wait` bằng `up -d`. Khi Docker Desktop vừa khởi động, container có thể mang trạng thái running trong lúc PostgreSQL vẫn đang chuẩn bị nhận kết nối; lệnh `dropdb` khi đó sẽ lỗi ngẫu nhiên.

Maildev được probe qua `127.0.0.1:1080` bên trong container. Không đổi lại thành `localhost`: trên một số Docker host tên đó resolve sang IPv6 `::1`, trong khi Maildev 2.1 chỉ listen IPv4 và container sẽ bị báo `unhealthy` dù web UI đang chạy. `pnpm bootstrap` chờ cả Postgres, Redis và Maildev healthy trước khi migrate/seed.

Script không đụng tới database phát triển `starter_db`. Playwright khởi động API ở `127.0.0.1:3101` và Admin ở `127.0.0.1:5174`. Cổng riêng ngăn test dùng nhầm process development; cùng hostname giúp cookie `SameSite=Lax` hoạt động giống topology đang được kiểm tra.

Client có browser suite riêng:

```powershell
pnpm e2e:client
```

Playwright khởi động cùng API E2E ở `127.0.0.1:3101` và Next.js ở `127.0.0.1:3006`. Suite đi qua Server Action/BFF thật để chứng minh browser chỉ giữ cookie `client_session` HttpOnly và không gọi thẳng API. Trên CI, Admin và Client chạy tuần tự trong cùng job **Frontend browser E2E**, dùng chung PostgreSQL/Redis disposable để tránh khởi tạo hai bộ hạ tầng giống nhau.

## 5. Prisma workflow

### Generate client

```powershell
pnpm db:generate
```

Generate không sửa database.

### Áp migration có sẵn

```powershell
pnpm db:deploy
```

Chạy `prisma migrate deploy`: chỉ áp những migration đã commit, không hỏi han, không sinh gì mới — dùng cho máy mới clone (`pnpm bootstrap` gọi lệnh này) và cho môi trường triển khai.

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

Seed import permission constants từ `@repo/contracts`. Vì clone mới chưa có `packages/contracts/dist`, script `@repo/database#db:seed` build package này trước rồi mới gọi Prisma seed. Không bỏ bước chuẩn bị đó hoặc gọi thẳng `prisma db seed` trong automation; máy đã từng build có thể chạy được nhờ artifact cũ và che mất lỗi onboarding.

```powershell
pnpm db:seed
```

Script seed phải idempotent (chạy lại nhiều lần không làm hỏng dữ liệu), hoặc chỉ được chạy trên database vừa reset một cách rõ ràng.

### `db push`

`pnpm db:push` ép database khớp schema hiện tại mà không ghi lại lịch sử migration. Chỉ dùng cho database prototype/test kiểu dùng xong bỏ. Không dùng cho staging/production.

Migration chain được CI đối chiếu với schema bằng `pnpm verify:migrations`. Job bắt đầu bằng PostgreSQL rỗng, chạy toàn bộ lịch sử qua `prisma migrate deploy`, rồi so database kết quả với `schema.prisma` bằng `prisma migrate diff --exit-code`. Exit code `2` nghĩa là có drift và làm CI fail, kể cả khi field/index bị thiếu chưa được E2E chạm tới. Migration `20260726073000_add_user_profile_menus_and_notifications` đóng phần drift từng tồn tại: `users.username`, `users.avatar`, bảng `menus` và `notifications`. Database dev local đã được baseline bằng `prisma migrate resolve --applied` cho toàn bộ chain; `prisma migrate status` phải trả "up to date".

`verify:migrations` không xóa database, nhưng nó sẽ áp mọi migration còn thiếu. Chỉ chạy thủ công với database kiểm thử riêng; không trỏ lệnh kiểm tra vào production. Backend E2E sau gate vẫn dùng `db push --force-reset` trên chính database `_test`, nên test behavior không phụ thuộc dữ liệu mà bước migration vừa tạo.

Lệnh cần replay migration chain (`migrate diff --from-migrations`, `migrate dev`) yêu cầu `SHADOW_DATABASE_URL` trỏ tới một database dùng xong bỏ, ví dụ `postgresql://postgres:password@localhost:5433/starter_shadow`.

Không giả vờ database đã được migrate chỉ vì schema hiện tại trùng — môi trường mới phải dựng bằng `prisma migrate deploy`, không phải `db push`.

### Deployment migration

Production/staging dùng:

```bash
prisma migrate deploy
```

Nên chạy lệnh này như một bước riêng trong đợt phát hành (release job), trước khi triển khai bản ứng dụng mới. Không để mọi bản sao API (replica) tự chạy migration lúc khởi động — nhiều bản cùng chạy sẽ giẫm lên nhau.

## 6. Chiến lược volume của Docker Compose

Workflow mặc định vẫn là chạy application trên host và chỉ chạy Postgres, Redis, Maildev bằng Docker. Service `api` là workflow tùy chọn, nằm sau profile `container-dev`.

`api` bind mount repository vào `/app` để watch source code. Dependency Linux không được ghi vào bind mount của Windows: mỗi thư mục `node_modules` được che bởi một **named volume** ổn định. Compose tái sử dụng các volume này khi recreate container thay vì sinh anonymous volume mới.

Các mount được quản lý gồm root workspace, ba app và năm shared package:

```text
/app/node_modules
/app/apps/{server,client,admin}/node_modules
/app/packages/{contracts,database,eslint-config,types,typescript-config}/node_modules
```

Việc che đủ mọi `node_modules` có hai mục đích:

1. pnpm trong container không tạo symlink Linux vào filesystem Windows;
2. recreate `starter-api-dev` không để lại thêm nhiều GB anonymous volume.

Named volume là cache dependency, không phải dữ liệu nghiệp vụ. `postgres_data` và `redis_data` mới là volume hạ tầng có dữ liệu cần bảo vệ.

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

## 7. Vận hành và kiểm soát dung lượng Compose

Compose mặc định chỉ chứa infrastructure. Application container nằm trong profile `container-dev`.

Host workflow:

```bash
docker compose up -d
pnpm dev
```

Container-dev workflow:

```bash
docker compose --profile container-dev up api
```

Không chạy đồng thời pnpm trên host và `api` container vào cùng workspace. Hai workflow có dependency tree riêng và chỉ chia sẻ source code.

Kiểm tra dung lượng định kỳ:

```bash
docker system df
docker system df -v
```

`docker compose down` xóa container và network của project nhưng giữ mọi named volume. Không thêm `--volumes` nếu muốn giữ database local.

Khi cần reset riêng cache dependency của container-dev, dừng và xóa container trước, sau đó chỉ xóa các named volume có hậu tố `_node_modules`. Không xóa `turborepo-advanced-starter_postgres_data` hoặc `turborepo-advanced-starter_redis_data`.

`docker volume prune` tác động đến mọi unused volume trên máy, kể cả volume của repository khác. Chỉ dùng sau khi đã xem `docker system df -v` và xác nhận dữ liệu không còn cần thiết. Tương tự, build cache có thể dọn bằng `docker builder prune`; lần build kế tiếp sẽ chậm hơn vì phải dựng lại layer.

Trên Docker Desktop/WSL2, file virtual disk có thể chưa co lại ngay sau cleanup dù Docker đã báo dung lượng được giải phóng. Hãy kiểm tra số liệu trong `docker system df` trước; việc compact virtual disk là bước riêng của Docker Desktop/WSL, không phải lý do để xóa thêm volume.

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

Công thức trên đã được hiện thực tại `apps/server/Dockerfile`: build nhiều giai đoạn (multi-stage), chạy bằng user không có quyền root, có `HEALTHCHECK` trỏ `/health/live`, và CI build + quét + publish image này lên GHCR (xem mục 13). Worker chạy từ cùng image với entry khác: `node dist/worker.js`.

Lưu ý cho người sửa Dockerfile: với `node-linker=hoisted`, các link `@repo/*` nằm trong `node_modules` của từng app (trỏ về `packages/`), không nằm ở `node_modules` gốc — stage runner phải copy cả `apps/server/node_modules`, thiếu nó là image build xong nhưng crash `MODULE_NOT_FOUND` lúc chạy.

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

### Provider-neutral single-node topology

`deploy/compose/compose.production.yaml` hiện thực process boundary không phụ thuộc nhà cung cấp: Caddy nhận public traffic; API và worker dùng chung immutable image; migration chạy one-off trước rollout; PostgreSQL/Redis nằm trên internal network và persistent volume. CI kiểm tra manifest bằng `pnpm verify:compose`.

Topology này dùng để diễn tập production trên Ubuntu/WSL2, đưa lên VPS nhỏ hoặc làm bước trung gian trước ECS. Nó không phải high availability và database container không thay thế managed database khi dữ liệu khách hàng quan trọng. Cách tạo environment, build/pull image, deploy, seed, verify và rollback nằm tại [Triển khai backend không phụ thuộc nhà cung cấp](provider-neutral-deployment.md).

### Vercel topology cho hai frontend

Repository chỉ có hai frontend deployable: project **Admin** trỏ Root Directory `apps/admin`, project **Client** trỏ Root Directory `apps/client`. Không tạo project `web` và không trỏ một Vercel project vào repository root; làm vậy khiến Vercel tự đoán sai framework/build target trong monorepo.

Admin dùng Git integration của Vercel. Project Settings cần giữ:

- Framework Preset: Vite;
- Root Directory: `apps/admin`;
- Output Directory: `dist` (được khóa lại trong `apps/admin/vercel.json`);
- Install command: dùng package manager từ repository (`pnpm install`);
- `VITE_API_URL` được scope riêng cho Development, Preview và Production.

`VITE_API_URL` là public browser config, không phải secret. Preview không được dùng nhầm API production nếu preview origin chưa nằm trong CORS allowlist. Production phải là HTTPS origin và build sẽ từ chối localhost hoặc biến bị thiếu. Vite sinh CSP từ cùng origin; Vercel áp static security headers và SPA rewrite.

Quality CI build với `https://api.ci.example.invalid`, sau đó chạy `scripts/verify-production-build.mjs`. Verifier fail nếu artifact có localhost, source map, thiếu CSP, thiếu header contract hoặc mất catch-all rewrite. Turbo khai báo `VITE_API_URL` trong `globalEnv`, vì output frontend thay đổi theo biến này và không được tái dùng remote cache từ origin khác.

## 13. CI và CD: từ commit đến artifact

**CI (Continuous Integration)** nghĩa là mọi thay đổi được ghép vào repository phải được một máy sạch kiểm tra tự động. Máy CI không tin kết quả từ laptop của lập trình viên: nó cài đúng lockfile, tạo Prisma client, kiểm tra format/kiểu, chạy test và build lại từ đầu. Nếu một gate đỏ, thay đổi chưa đủ điều kiện để merge hoặc tạo artifact.

**CD** có hai cách hiểu dễ bị trộn:

- **Continuous Delivery** tự động tạo artifact đã kiểm tra và để nó sẵn sàng triển khai, nhưng con người quyết định khi nào phát hành và deploy.
- **Continuous Deployment** đi xa hơn: mỗi thay đổi qua gate sẽ tự động được đưa tới production.

Repo này triển khai **Continuous Delivery**, không tự động deploy production. CI tạo Server/Client image theo commit SHA và đẩy lên GHCR sau khi code đã vào `main`; release workflow gắn version khi con người merge release PR. Việc chọn môi trường, chạy migration, đổi image tag, smoke test và quan sát rollout vẫn là bước vận hành có chủ đích. Starter không sở hữu một production provider nên không được giả vờ rằng “image đã push” đồng nghĩa “khách hàng đang dùng phiên bản mới”.

```mermaid
flowchart TD
    A[PR hoặc push main] --> B[Quality, backend E2E, browser E2E]
    A --> C[Secret scan và dependency audit]
    B -->|một gate đỏ| X[Không merge / không publish image]
    C -->|một gate đỏ| X
    B -->|tất cả xanh| F[Build Server + Client image]
    C -->|tất cả xanh| F
    F --> G[SBOM + vulnerability scan]
    G -->|PR| D[Đủ điều kiện merge, không push image]
    G -->|main| H[Push image tag SHA và latest lên GHCR]
    H --> I[release-please mở hoặc cập nhật release PR]
    I -->|Con người merge| J[Git tag + GitHub Release + version image tags]
    J --> K[Operator deploy migration + image, smoke test, theo dõi]
```

Ba workflow có trách nhiệm khác nhau:

- `.github/workflows/ci.yml` kiểm tra chất lượng, E2E và tạo hai image.
- `.github/workflows/security.yml` tìm secret/lỗ hổng trên push, PR và theo lịch hằng tuần.
- `.github/workflows/release.yml` quản lý version/changelog và gắn version cho image đã được CI build; nó không build lại và không deploy.

### Luồng CI của một pull request

Khi PR được mở hoặc cập nhật, các nhánh kiểm tra chạy độc lập để phản hồi sớm:

- Job `quality`: frozen install → Prisma generate → kiểm tra Compose/env/docs/backup/alerts → lint → typecheck → unit test → build → performance/artifact verifier.
- Job `Backend E2E`: dựng PostgreSQL và Redis dùng một lần → replay migration chain → build dependency → chạy API E2E trên database `_test`.
- Job `Frontend browser E2E`: dựng PostgreSQL/Redis → migrate/seed → mở Chromium → chạy Admin rồi Client qua backend thật → lưu trace/video/screenshot khi lỗi.
- Workflow security chạy secret scan và dependency audit song song.

Job **Frontend browser E2E** còn quét tự động WCAG A/AA cho các trang Client đại diện, thử điều hướng bàn phím và chạy acceptance flow đăng nhập thật. Đây là regression gate, không phải tuyên bố toàn bộ sản phẩm đã đạt chứng nhận accessibility. JavaScript budget được đọc từ diagnostics của chính production build; nếu route quan trọng biến mất hoặc vượt 560 KiB thì CI dừng trước khi image được publish.

Gitleaks secret scan đọc toàn bộ lịch sử; `pnpm audit --audit-level=high` kiểm tra cả dependency production lẫn công cụ phát triển. Package chỉ chạy trong CI vẫn có thể đọc source, token hoặc artifact nên không được mặc định bỏ qua. Các dependency bắc cầu có bản vá được khóa tập trung bằng `pnpm.overrides` ở `package.json`; mỗi override phải qua toàn bộ test/build trước khi merge. Gitleaks được pin phiên bản, tải cùng checksum chính thức và xác minh SHA-256 trước khi cài; không gọi API “latest release” trong mỗi job vì kết quả đó phụ thuộc rate limit và trạng thái GitHub API tại thời điểm chạy.

Node được pin qua `.nvmrc`, pnpm qua trường `packageManager`. Các JavaScript action chính dùng runtime Node 24 (`checkout@v6`, `setup-node@v6`, `upload-artifact@v6`, `pnpm/action-setup@v4.4.0` và `release-please-action@v5`) để không phụ thuộc runtime Node 20 đã bị GitHub deprecate. Dependabot cập nhật npm dependencies và GitHub Actions hàng tuần (`.github/dependabot.yml`). Local có husky pre-commit (lint-staged + prettier) và commit-msg (commitlint, conventional commits).

Job `image` chạy ma trận cho hai artifact độc lập là `server` và `client`, rồi biến source code đã qua kiểm tra thành Docker image:

1. Build `server` bằng `apps/server/Dockerfile` và `client` bằng `apps/client/Dockerfile`.
2. Tạo SBOM riêng cho từng image — danh sách package thực sự có trong image — và lưu chúng như artifact của CI.
3. Dùng Trivy quét lỗ hổng mức HIGH/CRITICAL; cấu hình hiện tại bỏ qua mục chưa có bản vá và chặn job nếu artifact chứa mục đã có cách vá ở hai mức này.
4. Chỉ khi commit đã merge vào `main`, đẩy image lên GHCR với tag SHA và `latest`.

Image được build bằng Docker engine đã có sẵn trên GitHub-hosted runner. Pipeline không khởi tạo thêm container Buildx chạy `moby/buildkit`: bước khởi tạo đó buộc CI kéo một image không thuộc sản phẩm từ Docker Hub trước khi đọc Dockerfile, nên một lần registry chậm hoặc timeout có thể làm hỏng job dù source code hoàn toàn hợp lệ. Đổi lại, job không export layer cache qua GitHub Actions; với một server image, độ tin cậy của quality gate được ưu tiên hơn thời gian build lại.

Docker build vẫn có thể cần kết nối registry để lấy base image được khai báo trong Dockerfile. Điểm khác biệt là lần tải này phục vụ trực tiếp artifact của dự án, thay vì chỉ khởi động một builder trung gian. Nếu registry lỗi ở đây, log sẽ chỉ ra base image cụ thể; người vận hành có thể retry job và không nhầm sự cố registry với lỗi code.

Job phụ thuộc cả quality test lẫn E2E, nên code chưa qua gate không được publish. GHCR có hai package `server` và `client`, cùng tag bằng commit SHA để biết chính xác hai artifact sinh từ phiên bản source nào. Khi release-please tạo version, release workflow retag **cả hai** SHA artifact bằng cùng version và fail nếu thiếu một trong hai; workflow không build lại image. API và worker chạy cùng image `server`; worker chỉ đổi entry command thành `node dist/worker.js`. Next.js self-host chạy image `client`; Vercel vẫn có thể deploy trực tiếp từ source mà không dùng image này.

### Khi một job thất bại thì hiểu thế nào?

Đọc tên job trước khi đọc dòng lỗi cuối cùng. `quality` đỏ thường là contract source/build; `Backend E2E` đỏ là migration hoặc hành vi API với dependency thật; `Frontend browser E2E` đỏ là flow xuyên lớp; `image` đỏ là Docker build, SBOM, CVE hoặc registry; security đỏ là secret/dependency. Lỗi tải image/action từ registry có thể là sự cố mạng bên ngoài, nhưng chỉ retry sau khi log cho thấy source chưa hề được build hoặc test — không gắn nhãn “flaky” cho một assertion thật sự thất bại.

Output của CI không phải deployment: PR chỉ có report; commit `main` có thêm hai image tag SHA; release PR được merge mới có version/tag/changelog. Production chỉ thay đổi khi operator làm theo deployment contract và xác nhận readiness/smoke test.

Database dùng cho test phải có tên/phạm vi riêng; backend E2E đã có chốt chặn từ chối reset bất kỳ database nào không có hậu tố `_test`. Setup gọi `prisma db push` và `db:seed` qua package `@repo/database`, là nơi sở hữu schema, Prisma config và executable `tsx`; không dựa vào package hoisting hoặc `npx` tìm dependency từ thư mục Server.

Quy trình phát hành từng bước, cách quay lui và cách xử lý khi hệ thống đang có sự cố nằm ở [Sổ tay vận hành](operations-runbook.md).

## 14. Release flow

```text
merge reviewed change
→ CI produces SHA-tagged Server/Client images
→ release workflow adds a human-readable version tag when release PR is merged
→ deploy migration job
→ deploy application
→ health/readiness passes
→ smoke tests
→ monitor errors, outbox lag, queue and latency
```

Muốn quay lui (rollback) ứng dụng thì triển khai lại image của phiên bản trước. Với database thì không mặc định chạy migration lùi (down migration); thay vào đó, khi cần triển khai không gián đoạn (zero downtime), thay đổi schema phải tương thích ngược theo kiểu expand/contract — thêm cái mới trước, chuyển dần, rồi mới bỏ cái cũ.

## 15. Health và shutdown

API bật Nest shutdown hooks. Khi được lệnh tắt, adapter, queue, Redis và outbox poller phải ngừng nhận việc mới, chờ các việc đang làm dở trong một giới hạn thời gian, rồi đóng kết nối.

Production bắt buộc đặt `METRICS_TOKEN` ngẫu nhiên tối thiểu 32 ký tự. `GET /metrics` chỉ chấp nhận Bearer token này; local development được phép bỏ trống để quan sát nhanh. API scrape trạng thái outbox trong PostgreSQL, queue BullMQ trong Redis và heartbeat backup từ bind mount read-only. Worker không mở cổng metrics riêng nhưng dùng cùng Pino JSON/redaction với API, nên log của hai process có cùng hình dạng để hệ thống thu thập log xử lý.

`deploy/observability/alerts.yml` là bộ Prometheus rules khởi đầu. Scrape config phải đặt `job_name: turborepo-api`, vì rules cố ý lọc đúng job này để không trộn metrics của môi trường khác. CI chạy `pnpm verify:alerts` để kiểm tra schema, tên duy nhất, duration, severity và annotation. Validator không thay Prometheus runtime: sau khi nạp rules, operator vẫn phải xem trang `/rules` và gửi test notification qua Alertmanager hoặc provider đang dùng.

Health endpoint nên phân biệt:

- liveness: process còn sống hay không;
- readiness: instance đã sẵn sàng nhận traffic hay chưa;
- dependency detail: trạng thái database/Redis cho người vận hành xem, nhưng không để lộ secret.

`AUDIT_RETENTION_DAYS` là policy dữ liệu, không phải tuning hiệu năng. Giá trị `0` mặc định tắt cleanup. Số ngày dương làm API
cleanup audit record cũ lúc bootstrap và mỗi 24 giờ theo batch 1.000, tối đa 100.000 record/cycle; migration tạo index
`audit_logs_createdAt_idx` bằng `CREATE INDEX CONCURRENTLY` để lọc cutoff mà không chặn audit write lúc deploy. Không copy
`OUTBOX_RETENTION_DAYS` sang audit theo thói quen: outbox là delivery bookkeeping, còn audit có thể chịu hợp đồng, legal hold
hoặc yêu cầu archive khác hoàn toàn.

## 16. Backup và dữ liệu

Named volume trên máy local không phải là bản sao lưu. PostgreSQL production cần:

- sao lưu tự động;
- khôi phục về đúng một thời điểm (point-in-time recovery) nếu có yêu cầu;
- diễn tập khôi phục (restore drill) để chắc rằng bản sao lưu dùng được thật;
- chính sách thời gian lưu giữ bản sao lưu (retention);
- scheduler gọi `backup-and-verify.sh`; cycle phải dump, restore thử và upload mã hóa bằng Restic trước khi được dọn bản local;
- mã hóa và kiểm soát truy cập.

CI chạy `pnpm verify:backup` với Restic giả lập để khóa contract gọi repository và hai file dump/checksum. Test cũng chứng minh
password file không đọc được làm cycle fail. Cùng gate kiểm tra freshness contract: heartbeat mới pass; heartbeat quá hạn,
thiếu hoặc không đủ field phải fail. Đây là contract test cho orchestration; restore drill với PostgreSQL thật và một lần tải
snapshot từ storage thật vẫn là checkpoint vận hành bắt buộc.

Compose chỉ mount `deploy/compose/backup-status` vào API bằng quyền read-only; thư mục chứa dump không đi vào application container. Boundary này quan trọng: API cần biết thời điểm cycle gần nhất, không cần và không được quyền đọc nội dung database backup. `deploy.sh` tạo cả hai thư mục bằng deployment user trước khi Docker khởi động; nếu để Docker tự tạo, thư mục có thể thuộc root và systemd backup service không ghi heartbeat được. Ba backup metrics chỉ xuất hiện khi `BACKUP_STATUS_FILE` được cấu hình. `backup_status_available=0` nghĩa là path đã được cấu hình nhưng API không đọc được file; `backup_age_seconds=-1` cũng biểu diễn trạng thái unavailable, không được hiểu là backup mới.

Repository khóa `*.sh`, systemd unit, Dockerfile và Caddyfile về LF trong `.gitattributes`. Đây là contract chạy Linux, không phải lựa chọn hiển thị: CRLF có thể làm `/usr/bin/env` hoặc POSIX `sh` báo lỗi dù nội dung nhìn đúng trong editor Windows.

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

## Tự kiểm tra: phân biệt ba cách chạy

Trước khi sang deployment, hãy tự mô tả được ba workflow mà không trộn chúng: host development, container development và production image. Với mỗi workflow, chỉ ra ai cài dependency, database được gọi bằng hostname nào, migration chạy bằng lệnh nào và dữ liệu nào tồn tại sau khi container bị recreate.
