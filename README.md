# Turborepo Advanced Starter

Đây là monorepo nền tảng gồm một NestJS API, một React Admin SPA, một Next.js client và các package dùng chung. Repository ưu tiên bốn thứ: kiến trúc có ranh giới rõ ràng giữa các phần, contract dùng chung để các app hiểu dữ liệu giống nhau, cơ chế đăng nhập có khả năng thu hồi phiên, và tài liệu bám sát code thật.

Không phải mọi phần đều có cùng mức hoàn thiện. Backend và Admin đã có kiến trúc nghiệp vụ; `apps/client` hiện vẫn chỉ là bộ khung Next.js tối thiểu (scaffold), chưa có tính năng thật. Các giới hạn đang tồn tại được ghi rõ thay vì được che bằng nhãn “enterprise”.

## Bản đồ tài liệu

Người mới vào repo: bắt đầu từ [Lộ trình học từ đầu](docs/getting-started-path.md) và mở kèm [Bảng thuật ngữ](docs/glossary.md) — hai tài liệu này dẫn bạn qua toàn bộ hệ thống theo thứ tự có chủ đích, kèm bài tập tự kiểm tra. Các tài liệu còn lại là tra cứu theo nhu cầu.

| Tài liệu                                                       | Đọc khi cần                                                                       |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [Lộ trình học từ đầu](docs/getting-started-path.md)            | Mới vào repo, muốn học có thứ tự với bài tập thực hành và câu hỏi tự kiểm tra     |
| [Bảng thuật ngữ](docs/glossary.md)                             | Tra nghĩa mọi thuật ngữ trong docs, mỗi khái niệm kèm ví dụ trong chính repo      |
| [Kiến trúc hệ thống](docs/architecture.md)                     | Hiểu ranh giới app/package, backend layers, frontend layers và flow liên ứng dụng |
| [Phát triển và triển khai](docs/development-and-deployment.md) | Cài môi trường, chạy Docker/host, migration, CI và production topology            |
| [Backend handbook](apps/server/README.md)                      | Đọc code NestJS, request flow, CQRS, outbox, auth và testing                      |
| [Admin handbook](apps/admin/README.md)                         | Đọc React Admin, routing, query cache, auth refresh, RBAC và realtime             |
| [Client handbook](apps/client/README.md)                       | Trạng thái hiện tại và quy ước phát triển Next.js client                          |
| [Auth context](apps/server/src/contexts/iam/auth/README.md)    | Login, refresh rotation, logout, session và token revocation                      |
| [Users context](apps/server/src/contexts/iam/users/README.md)  | User aggregate, commands, repository transaction và domain events                 |
| [Roles context](apps/server/src/contexts/iam/roles/README.md)  | Role, permission catalog và RBAC behavior                                         |
| [Audit context](apps/server/src/contexts/audit/README.md)      | Audit port, persistence và query flow                                             |

## Thành phần trong monorepo

```text
turborepo-advanced-starter/
├── apps/
│   ├── server/                 # NestJS API, port mặc định 3001
│   ├── admin/                  # React + Vite Admin SPA, port 5173
│   └── client/                 # Next.js App Router, port 3005
├── packages/
│   ├── contracts/              # Permission constants và contract dùng chung
│   ├── database/               # Prisma schema, migrations và Prisma Client export
│   ├── types/                  # TypeScript data types dùng giữa các app
│   ├── eslint-config/          # Shared lint configuration
│   └── typescript-config/      # Shared TypeScript configuration
├── docs/                       # Tài liệu kiến trúc và vận hành
├── docker-compose.yml          # Local infrastructure và API container hiện tại
├── turbo.json                  # Task graph
└── pnpm-workspace.yaml         # Workspace membership
```

## Kiến trúc ở mức hệ thống

```mermaid
flowchart LR
    Admin[React Admin] -->|HTTP + JWT| API[NestJS API]
    Client[Next.js Client] -.->|chưa tích hợp| API
    Admin <-->|Socket.IO| Realtime[Realtime Gateway]
    API --> Postgres[(PostgreSQL)]
    API --> Redis[(Redis)]
    API --> Queue[BullMQ]
    Queue --> Worker[Background processors]
    API --> Outbox[(outbox_events)]
    Outbox --> SideEffects[Cache / Queue / Realtime]
```

Backend chia theo bounded context (mỗi mảng nghiệp vụ là một khu riêng) và theo kiểu Ports & Adapters (phần nghiệp vụ nói chuyện với thế giới bên ngoài qua các cổng trừu tượng). Admin chia theo feature; mỗi feature tự giữ API adapter và query-key factory ở ranh giới của mình. Package dùng chung chỉ chứa những contract thực sự cần chia sẻ; không đặt code nghiệp vụ của riêng một app vào package chung.

Đọc [docs/architecture.md](docs/architecture.md) để hiểu dependency direction và flow chi tiết.

## Quick start chuẩn trên Windows

Workflow mặc định là chạy application trên host và chỉ chạy infrastructure bằng Docker.

### 1. Yêu cầu

- Node.js 20 được khuyến nghị.
- pnpm 9, được pin bởi `packageManager`.
- Docker Desktop.

```powershell
corepack enable
pnpm install --frozen-lockfile
```

### 2. Environment

Tạo `.env` ở root cho các script Prisma và `apps/server/.env` cho API. Tham khảo `apps/server/.env.example`.

Các giá trị local quan trọng:

```dotenv
DATABASE_URL=postgresql://postgres:password@localhost:5433/starter_db?schema=public
REDIS_HOST=localhost
REDIS_PORT=6380
PORT=3001
CORS_ORIGINS=http://localhost:5173,http://localhost:3005
```

### 3. Khởi động infrastructure

API container nằm sau profile `container-dev`, nên lệnh mặc định chỉ khởi động infrastructure:

```powershell
docker compose up -d
```

### 4. Database

```powershell
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

`db:migrate` là workflow chuẩn khi schema cần lịch sử migration. `db:push` chỉ dành cho database tạm/prototype và không thay thế migration.

Seed yêu cầu `SEED_ADMIN_PASSWORD` (tối thiểu 12 ký tự) trong `.env` root để tạo tài khoản admin lần đầu; nếu thiếu, seed vẫn chạy nhưng bỏ qua bước tạo admin. Re-seed không bao giờ reset mật khẩu admin đang tồn tại, và menu chỉ được seed khi bảng `menus` rỗng.

### 5. Chạy application

```powershell
pnpm dev
```

| Service    | URL                         |
| ---------- | --------------------------- |
| API        | `http://localhost:3001`     |
| Swagger    | `http://localhost:3001/api` |
| Admin      | `http://localhost:5173`     |
| Client     | `http://localhost:3005`     |
| Maildev    | `http://localhost:1083`     |
| PostgreSQL | `localhost:5433`            |
| Redis      | `localhost:6380`            |

Có thể chạy riêng:

```powershell
pnpm dev:server
pnpm dev:admin
pnpm dev:client
```

## Task graph và quality gate

Turborepo chạy task theo đồ thị phụ thuộc: package dùng chung phải được build xong trước, rồi app dùng nó mới được build.

```powershell
pnpm lint
pnpm check-types
pnpm build
pnpm --filter=server verify
pnpm --filter=admin verify
```

Admin `verify` chạy lint, Vitest và production build. Server `verify` chạy lint, build, typecheck và unit tests. E2E backend là task riêng vì cần test database.

## Quy tắc kiến trúc

1. Domain backend không phụ thuộc NestJS, Prisma, Redis hoặc HTTP.
2. Controller chỉ làm việc chuyển đổi: nhận input từ HTTP/WebSocket, đổi thành command/query, rồi đổi kết quả thành response trả về.
3. Thay đổi trên aggregate và domain event kèm theo phải được ghi trong cùng một transaction (atomic) thông qua transactional outbox — hoặc cả hai cùng được lưu, hoặc không gì cả.
4. Frontend component không gọi raw `fetch`; endpoint nằm trong feature API adapter.
5. Feature frontend khác chỉ được truy cập qua public `index.ts`.
6. Permission string lấy từ `@repo/contracts`.
7. Dữ liệu lấy từ server do TanStack Query quản; phiên đăng nhập do Zustand quản; trạng thái tương tác ngắn hạn nằm ngay trong component.
8. Package dùng chung không trở thành nơi đổ code chỉ vì một đoạn code được dùng ở hai chỗ.
9. Migration đã commit là lịch sử của database; không chỉnh sửa migration đã được môi trường khác chạy.
10. Tài liệu phải mô tả hành vi đang thực sự tồn tại và chỉ rõ nợ kỹ thuật (technical debt).

## Trạng thái và technical debt quan trọng

- API development container trong Docker Compose đã nằm sau profile `container-dev`; `docker compose up -d` mặc định chỉ khởi động infrastructure. Container này vẫn mount toàn bộ repository từ máy ngoài vào (bind mount) — nếu dùng nó, xem hướng dẫn vận hành để tránh việc symlink kiểu Linux làm hỏng `node_modules` trên Windows.
- Outbox được quét (poll) mỗi 100 ms theo mặc định, nhưng khi hạ tầng lỗi thì chưa biết giãn dần thời gian chờ (backoff), vì vậy lỗi kết nối có thể spam log.
- Refresh token của Admin vẫn nằm trong `localStorage`; mục tiêu an toàn hơn là chuyển sang cookie HttpOnly, kèm thay đổi contract đồng bộ ở cả hai phía.
- Bundle khởi động của Admin vẫn lớn; cần đo bằng bundle analyzer trước khi tự tay chia nhỏ (manual chunking).
- Next.js client chưa có business feature hoặc backend integration.

Danh sách này là phần của kiến trúc hiện tại, không phải ghi chú tùy chọn.

## Khi bắt đầu một thay đổi

Trước khi sửa code, xác định hành vi cần sửa thuộc về app hoặc bounded context nào. Đọc handbook tương ứng, tìm ranh giới công khai (public boundary) và bài test gần nhất với chỗ định sửa. Sau khi sửa, cập nhật tài liệu nếu flow, contract, command, port hoặc cách vận hành thay đổi.

Nếu một thay đổi chạm cả backend và frontend, contract phải được sửa trước hoặc trong cùng một đợt thay đổi; không để mỗi bên tự đoán response theo một kiểu.
