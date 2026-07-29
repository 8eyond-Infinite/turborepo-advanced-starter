# Turborepo Advanced Starter

> **Phần I · Chương 1 — Repository nhìn từ bên ngoài**
>
> Chương trước: chưa có · [Mục lục handbook](docs/README.md) · Chương sau: [Lộ trình học repo](docs/getting-started-path.md)

Đây là cửa vào ngắn nhất của repository. Sau chương này, bạn chỉ cần trả lời được bốn câu: hệ thống có những chương trình nào, mỗi chương trình phục vụ ai, dữ liệu chính nằm ở đâu và chạy dự án bằng lệnh nào. Chưa cần hiểu CQRS, outbox hay BFF; các chương sau sẽ giới thiệu chúng khi flow thực sự cần đến.

Hãy hình dung repository như một khu làm việc chung. `apps/server` giữ nghiệp vụ và dữ liệu. `apps/admin` là công cụ vận hành dành cho quản trị viên. `apps/client` minh họa website hướng người dùng bằng Next.js. Các package dưới `packages/` là hợp đồng và công cụ mà nhiều application cùng dùng, không phải application có thể deploy độc lập.

Đây là một repository chứa nhiều ứng dụng cùng phát triển và dùng chung code — cách tổ chức đó gọi là **monorepo**. Bên trong có NestJS API, React Admin, Next.js Client và các package dùng chung. Mục tiêu là để các phần hiểu dữ liệu giống nhau, không trộn nghiệp vụ của phần này sang phần khác, có thể thu hồi phiên đăng nhập và luôn có tài liệu bám sát code thật.

Không phải mọi phần đều có cùng mức hoàn thiện. Backend và Admin đã có kiến trúc nghiệp vụ; `apps/client` là một lát cắt dọc nhỏ minh họa mô hình BFF (render phía server, token không xuống trình duyệt) chứ không phải một sản phẩm hoàn chỉnh. Các giới hạn đang tồn tại được ghi rõ thay vì được che bằng nhãn “enterprise”.

## Bản đồ tài liệu

Nếu mới vào dự án, đừng chọn ngẫu nhiên một README rồi cố hiểu. Hãy dùng một trong các cửa sau:

| Bạn đang cần gì?                        | Bắt đầu ở đâu?                                                                                     |
| --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Chạy dự án và học từ con số không       | [Lộ trình học từ đầu](docs/getting-started-path.md)                                                |
| Đọc tài liệu như một cuốn sách          | [Mục lục Handbook](docs/README.md)                                                                 |
| Tra một từ kiến trúc vừa gặp            | [Bảng thuật ngữ](docs/glossary.md)                                                                 |
| Hiểu đường đi từ giao diện tới database | [Kiến trúc hệ thống](docs/architecture.md)                                                         |
| Sửa backend, Admin hoặc Client          | [Backend](apps/server/README.md) · [Admin](apps/admin/README.md) · [Client](apps/client/README.md) |
| Hệ thống đang lỗi và cần xử lý ngay     | [Sổ tay vận hành](docs/operations-runbook.md)                                                      |

[Mục lục Handbook](docs/README.md) chứa đủ các chương, gồm tài liệu cho từng nhóm nghiệp vụ, Docker, deployment và release. [Deployment readiness](docs/deployment-readiness.md) giải thích vì sao local Ubuntu production-like là gate bắt buộc, còn Vercel Preview/backend public chỉ là integration tùy chọn. Root README chỉ giúp bạn chọn đúng cửa vào; nó không cố nhét toàn bộ handbook vào một trang.

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

## Hệ thống chạy như thế nào?

Khi một quản trị viên bấm “Tạo user”, đường đi chính là:

1. Admin gửi HTTP request tới API.
2. API xác định người gọi và kiểm tra quyền.
3. API kiểm tra dữ liệu rồi lưu user vào PostgreSQL.
4. API ghi lại rằng một số việc nền cần được thực hiện.
5. Worker nhận việc qua Redis/BullMQ và gửi email.
6. Admin nhận response hoặc tín hiệu realtime rồi tải dữ liệu mới.

```mermaid
flowchart LR
    Admin[React Admin] -->|HTTP + JWT| API[NestJS API]
    Client[Next.js Client] -->|BFF: server-side fetch| API
    Admin <-->|Socket.IO| Realtime[Realtime Gateway]
    API --> Postgres[(PostgreSQL)]
    API --> Redis[(Redis)]
    API --> Queue[BullMQ]
    Queue --> Worker[Background processors]
    API --> Outbox[(outbox_events)]
    Outbox --> SideEffects[Cache / Queue / Realtime]
```

Backend không được viết thành một thư mục lớn chứa mọi nghiệp vụ. Code tài khoản, phiên đăng nhập, quyền, thông báo và audit nằm ở những khu riêng. Mỗi khu giữ quy tắc của mình và chỉ giao tiếp qua những đầu vào đã định nghĩa.

Admin cũng chia theo tính năng: Users, Roles, Sessions, Notifications. Package dùng chung chỉ giữ kiểu dữ liệu hoặc hằng số mà nhiều ứng dụng thật sự cần; code nghiệp vụ riêng của một ứng dụng không được đẩy vào `packages`.

Các cách chia này có tên kỹ thuật như bounded context, Ports & Adapters và feature boundary. [Chương kiến trúc](docs/architecture.md) giới thiệu từng tên sau khi giải thích vấn đề mà nó giải quyết.

## Quick start

Ở môi trường phát triển, ba application chạy trực tiếp trên máy để sửa code nhanh. Docker chỉ chạy PostgreSQL, Redis và Maildev.

Máy cần Node.js 20, pnpm 9 và Docker Desktop. Nếu chưa có pnpm, `corepack enable` sẽ bật đúng package manager được repository khai báo.

Từ clone tới chạy được là **một lệnh**:

```powershell
corepack enable
pnpm bootstrap
```

`pnpm bootstrap` chuẩn bị một máy mới theo đúng thứ tự:

1. Tạo file cấu hình local từ các file mẫu.
2. Sinh secret và mật khẩu admin nếu chúng chưa tồn tại.
3. Khởi động PostgreSQL, Redis và Maildev.
4. Cài dependency.
5. Tạo Prisma Client và cập nhật cấu trúc database.
6. Nạp permission, role, menu và tài khoản admin ban đầu.

Script giữ lại file cấu hình đã có nên có thể chạy lại khi setup bị gián đoạn. Khi hoàn tất, terminal in địa chỉ ứng dụng và tài khoản đăng nhập.

> Vì sao là `bootstrap` mà không phải `setup`? Vì `pnpm setup` là lệnh có sẵn của pnpm — script trùng tên sẽ bị lệnh built-in che mất.

Sau đó:

```powershell
pnpm dev          # chạy cả 3 app
```

Browser E2E của Admin chạy trên database dùng xong bỏ, không sửa dữ liệu development:

```powershell
pnpm --filter=admin exec playwright install chromium # lần đầu
pnpm e2e:admin
```

### Làm từng bước bằng tay

Chỉ dùng phần này khi muốn học hoặc chẩn đoán một bước bootstrap bị lỗi:

```powershell
pnpm install --frozen-lockfile
# Tạo .env (root), apps/server/.env, apps/client/.env.local từ các file .env.example
docker compose up -d      # API container nằm sau profile container-dev nên lệnh này chỉ chạy infrastructure
pnpm db:generate
pnpm db:deploy            # áp migration có sẵn; db:migrate là để TẠO migration mới khi phát triển
pnpm db:seed              # cần SEED_ADMIN_PASSWORD (>= 12 ký tự) trong .env root để tạo admin lần đầu
```

Các giá trị local quan trọng trong `.env`:

```dotenv
DATABASE_URL=postgresql://postgres:password@localhost:5433/starter_db?schema=public
REDIS_HOST=localhost
REDIS_PORT=6380
PORT=3001
CORS_ORIGINS=http://localhost:5173,http://localhost:3005
```

`db:deploy` chạy những file thay đổi database đã được commit. `db:migrate` tạo một file thay đổi mới khi lập trình viên sửa schema. `db:push` bỏ qua lịch sử migration nên chỉ dành cho database tạm; không dùng nó để chuẩn bị môi trường thật.

Seed cần `SEED_ADMIN_PASSWORD` dài ít nhất 12 ký tự để tạo admin lần đầu. Nếu tài khoản đã tồn tại, chạy seed lại không đổi mật khẩu. Đây là chốt an toàn để một lần setup hoặc deploy không vô tình khóa tài khoản quản trị.

### Các địa chỉ sau khi chạy

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

## Kiểm tra code trước khi push

Các lệnh sau kiểm tra format, kiểu TypeScript, test và khả năng build. Turborepo tự chạy package dùng chung trước application phụ thuộc vào nó:

```powershell
pnpm lint
pnpm check-types
pnpm build
pnpm --filter=server verify
pnpm --filter=admin verify
```

`admin verify` chạy lint, test và production build của Admin. `server verify` làm tương tự cho backend. E2E là nhóm test riêng vì cần database và Redis thật.

## Năm nguyên tắc cần nhớ trước khi sửa code

1. **Đặt code đúng chủ sở hữu.** Quy tắc tài khoản ở Users; phiên đăng nhập ở Auth; giao diện Users ở feature Users của Admin.
2. **Giữ nghiệp vụ độc lập với công cụ.** Quy tắc “user có được vô hiệu hóa hay không” không nằm trong controller hoặc câu lệnh Prisma.
3. **Không để dữ liệu và sự kiện lệch nhau.** Nếu lưu user thành công thì lời nhắc gửi email cũng phải được lưu; nếu một phần lỗi thì cả hai cùng rollback.
4. **Dùng chung contract, không dùng chung bừa nghiệp vụ.** Permission và kiểu response có thể nằm trong package chung; logic riêng của một app phải ở lại app đó.
5. **Code, test và tài liệu thay đổi cùng nhau.** Khi endpoint, flow, command, port hoặc hạ tầng đổi, tài liệu sở hữu phần đó phải đổi trong cùng PR.

Các quy tắc chi tiết về controller, repository, frontend cache, migration và import boundary nằm trong [chương kiến trúc](docs/architecture.md) và handbook của từng application.

## Một giới hạn dễ gây nhầm khi chạy Docker

`docker compose up -d` chỉ khởi động PostgreSQL, Redis và Maildev. API container nằm trong profile `container-dev` và không chạy nếu bạn không chọn profile đó. Workflow mặc định vẫn là Docker chạy hạ tầng, còn `pnpm dev` chạy application trên máy.

Dependency Linux của container nằm trong named volume riêng để không ghi symlink vào filesystem Windows. Đừng xóa volume theo phỏng đoán; đọc [chương Development và Docker](docs/development-and-deployment.md) trước khi reset.

## Khi bắt đầu một thay đổi

Trước khi sửa code, trả lời ba câu:

1. Hành vi này thuộc application và nhóm nghiệp vụ nào?
2. File public nào là cửa vào của nhóm đó?
3. Test gần nhất đang chứng minh điều gì?

Nếu thay đổi chạm cả backend và frontend, hãy sửa contract trong cùng đợt. Không để mỗi phía tự đoán response theo một kiểu. Khi flow hoặc cách vận hành đổi, cập nhật tài liệu trong cùng PR.
