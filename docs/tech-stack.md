# Thư viện trong repo dùng để làm gì

Mỗi dòng trả lời ba câu: thư viện này giải quyết việc gì, vì sao repo chọn nó, và tìm nó ở đâu trong code. Đọc kèm [Bảng thuật ngữ](glossary.md) khi gặp khái niệm lạ.

Nguyên tắc thêm dependency mới: phải trả lời được "nếu không có nó thì mình phải tự viết cái gì, và đoạn đó có đáng viết không". Thêm thư viện là thêm bề mặt tấn công và một thứ phải nâng cấp mãi mãi.

## Nền tảng chung

| Thư viện                             | Dùng để làm gì                                                                                                 | Ở đâu trong repo                         |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **Turborepo**                        | Chạy task theo đồ thị phụ thuộc và cache kết quả — sửa một package thì chỉ những gì phụ thuộc nó mới chạy lại. | `turbo.json`                             |
| **pnpm**                             | Quản lý dependency cho nhiều package trong một repo (workspace), tiết kiệm đĩa nhờ dùng chung store.           | `pnpm-workspace.yaml`, `.npmrc`          |
| **TypeScript**                       | Bắt lỗi kiểu lúc biên dịch; là ngôn ngữ chung giữa backend và frontend qua các package contract.               | `packages/typescript-config/`            |
| **tsup**                             | Build các package dùng chung ra JS + file khai báo kiểu (`.d.ts`) cho cả ESM lẫn CJS.                          | `packages/*/tsup.config.ts`              |
| **ESLint + Prettier**                | ESLint chặn lỗi logic và vi phạm ranh giới kiến trúc; Prettier format code để không ai tranh luận dấu cách.    | `packages/eslint-config/`, `.prettierrc` |
| **husky + lint-staged + commitlint** | Chạy format và kiểm tra định dạng commit message ngay trên máy dev, trước khi code kịp lên CI.                 | `.husky/`, `commitlint.config.cjs`       |

## Backend (`apps/server`)

### Khung ứng dụng

| Thư viện           | Dùng để làm gì                                                                                                                                                    | Ở đâu trong repo                         |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **NestJS**         | Khung xương ứng dụng: chia module, tiêm phụ thuộc (DI), guard/interceptor/pipe. DI chính là thứ cho phép domain chỉ biết port còn infrastructure cắm adapter vào. | `src/app.module.ts` và mọi `*.module.ts` |
| **@nestjs/cqrs**   | Cung cấp CommandBus/QueryBus để tách đường ghi và đường đọc thành các handler riêng.                                                                              | `src/contexts/*/application/`            |
| **@nestjs/config** | Đọc và kiểm tra biến môi trường một lần lúc khởi động, thay vì rải `process.env` khắp code.                                                                       | `src/config/environment.ts`              |
| **rxjs**           | Nest xây trên Observable; repo dùng trực tiếp trong interceptor (ví dụ đo thời gian request, ghi audit sau khi thành công).                                       | `src/presentation/interceptors/`         |

### Dữ liệu và hàng đợi

| Thư viện                                            | Dùng để làm gì                                                                                                            | Ở đâu trong repo                                            |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Prisma** (`@prisma/client`, `@prisma/adapter-pg`) | ORM sinh client có kiểu từ schema; quản lý migration. Adapter `pg` cho phép Prisma dùng driver PostgreSQL chuẩn của Node. | `packages/database/prisma/`, `src/infrastructure/database/` |
| **ioredis**                                         | Client Redis: lưu phiên refresh, cache HTTP và kênh pub/sub cho realtime.                                                 | `src/infrastructure/cache/redis.service.ts`                 |
| **BullMQ** (`bullmq`, `@nestjs/bullmq`)             | Hàng đợi job nền trên Redis: gửi email chậm không làm chậm API, job thất bại được thử lại có kiểm soát.                   | `src/infrastructure/queue/`, `src/worker.module.ts`         |

### Xác thực và bảo mật

| Thư viện                                | Dùng để làm gì                                                                                                              | Ở đâu trong repo                                                           |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **@nestjs/jwt**                         | Ký và xác minh JWT (access token, refresh token).                                                                           | `src/contexts/iam/auth/`                                                   |
| **passport + passport-jwt**             | Chuẩn hóa việc lấy token từ request và gắn thông tin người dùng vào `req.user`; repo dùng hai strategy (access và refresh). | `src/contexts/iam/auth/infrastructure/strategies/`                         |
| **bcrypt**                              | Băm mật khẩu với chi phí tính toán cao — kẻ lấy được database vẫn không đọc ngược ra mật khẩu.                              | `src/contexts/iam/users/infrastructure/services/bcrypt-password-hasher.ts` |
| **helmet**                              | Gắn các HTTP header bảo mật chuẩn (chống clickjacking, MIME sniffing…).                                                     | `src/main.ts`                                                              |
| **@nestjs/throttler**                   | Giới hạn số request mỗi IP — chặn dò mật khẩu hàng loạt ở `/auth/login`.                                                    | `src/app.module.ts`, `auth.controller.ts`                                  |
| **cookie-parser**                       | Đọc HttpOnly cookie chứa refresh token.                                                                                     | `src/main.ts`, `auth/presentation/refresh-cookie.ts`                       |
| **class-validator + class-transformer** | Kiểm tra dữ liệu request ngay tại biên HTTP bằng decorator, và chuyển JSON thô thành instance DTO có kiểu.                  | `src/contexts/*/presentation/dtos/`                                        |

### Realtime, mail, lưu trữ

| Thư viện                                                             | Dùng để làm gì                                                                                                               | Ở đâu trong repo                                                    |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **socket.io** (+ `@nestjs/websockets`, `@nestjs/platform-socket.io`) | Kênh hai chiều tới trình duyệt: đẩy thông báo, ép đăng xuất khi tài khoản bị khóa.                                           | `src/infrastructure/realtime/`                                      |
| **@socket.io/redis-adapter**                                         | Cho phép chạy nhiều bản sao API: sự kiện phát từ instance này tới được socket đang nối vào instance khác, qua Redis pub/sub. | `src/infrastructure/realtime/realtime.gateway.ts`                   |
| **nodemailer**                                                       | Gửi email SMTP từ worker (local trỏ vào Maildev).                                                                            | `src/contexts/iam/users/application/queues/user-queue.processor.ts` |
| **@aws-sdk/client-s3**                                               | Adapter lưu file lên S3/MinIO; bản local ghi thẳng vào đĩa.                                                                  | `src/contexts/storage/`                                             |

### Quan sát hệ thống và tài liệu API

| Thư viện                                 | Dùng để làm gì                                                                                                | Ở đâu trong repo                   |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| **nestjs-pino / pino / pino-http**       | Log dạng JSON để máy lọc được, giữ correlation ID; `pino-pretty` chỉ dùng ở môi trường phát triển cho dễ đọc. | `src/app.module.ts`, `src/main.ts` |
| **prom-client**                          | Thu thập số đo cho Prometheus: thời lượng request, độ sâu và độ trễ của outbox.                               | `src/infrastructure/metrics/`      |
| **@nestjs/swagger + swagger-ui-express** | Sinh tài liệu OpenAPI từ decorator trên controller/DTO; tắt ở production.                                     | `src/main.ts`                      |

### Kiểm thử backend

| Thư viện           | Dùng để làm gì                                                   | Ở đâu trong repo                                 |
| ------------------ | ---------------------------------------------------------------- | ------------------------------------------------ |
| **Jest + ts-jest** | Chạy unit test và E2E cho backend.                               | `apps/server/package.json`, `jest-e2e.config.js` |
| **supertest**      | Gọi HTTP vào ứng dụng Nest trong test mà không cần mở cổng thật. | `apps/server/test/auth.e2e-spec.ts`              |

## Admin (`apps/admin`)

| Thư viện                                           | Dùng để làm gì                                                                                                                             | Ở đâu trong repo                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| **React 19 + Vite**                                | Thư viện UI và công cụ build/dev server nhanh cho SPA.                                                                                     | `src/main.tsx`, `vite.config.ts`                  |
| **react-router-dom**                               | Định tuyến phía client; repo dùng data router để khai báo route kèm permission.                                                            | `src/routes/index.tsx`                            |
| **@tanstack/react-query**                          | Quản lý dữ liệu đến từ server: cache, trạng thái loading/error, làm mới sau khi ghi. Nhờ nó không phải tự viết logic đồng bộ cache.        | `src/features/*/hooks/`                           |
| **zustand**                                        | Giữ state toàn cục nhỏ gọn — ở đây chỉ dùng cho phiên đăng nhập.                                                                           | `src/features/auth/store/auth.store.ts`           |
| **Tailwind CSS v4**                                | Style bằng utility class ngay trong markup, không cần đặt tên class.                                                                       | `src/index.css`                                   |
| **radix-ui**                                       | UI primitive không kèm giao diện, lo sẵn phần accessibility khó (focus, bàn phím, ARIA); repo style lên trên theo phong cách shadcn.       | `src/components/ui/`                              |
| **class-variance-authority, clsx, tailwind-merge** | Bộ ba xử lý class: khai báo biến thể component, ghép class có điều kiện, và gộp class Tailwind mâu thuẫn nhau.                             | `src/components/ui/`, `src/lib/utils.ts`          |
| **lucide-react**                                   | Bộ icon SVG dạng component.                                                                                                                | Toàn bộ UI                                        |
| **recharts**                                       | Vẽ biểu đồ dashboard (tăng trưởng người dùng, phân bổ vai trò).                                                                            | `src/features/dashboard/`                         |
| **sonner**                                         | Hiện toast thông báo thành công/thất bại sau mỗi thao tác.                                                                                 | `src/features/*/hooks/`                           |
| **socket.io-client**                               | Nhận sự kiện realtime từ backend; connection, event mapping và lifecycle được tách thành application boundary.                             | `src/app/realtime/`                               |
| **i18next + react-i18next**                        | Dịch thông điệp lỗi theo `translationKey` mà backend trả về.                                                                               | `src/i18n/`                                       |
| **date-fns**                                       | Định dạng thời gian tương đối kiểu "5 phút trước" theo locale tiếng Việt.                                                                  | `src/components/notification-bell.tsx`, dashboard |
| **next-themes**                                    | Chuyển giao diện sáng/tối.                                                                                                                 | `src/components/theme-provider.tsx`               |
| **Vitest + Testing Library**                       | Chạy test trong môi trường jsdom và render component theo cách người dùng nhìn thấy (tìm theo nhãn, vai trò) thay vì theo chi tiết nội bộ. | `src/**/*.test.tsx`, `src/test/setup.ts`          |

## Client (`apps/client`)

**Next.js** (App Router, Server Components, Server Actions, middleware) + React, cùng `@repo/types` và `@repo/contracts`. Không có thư viện auth hay data-fetching riêng: phiên đăng nhập là một cookie HttpOnly do chính Next.js quản lý, còn dữ liệu được lấy bằng `fetch` ở phía server. `server-only` chặn việc lỡ import code chứa token vào Client Component. `jose` mã hóa nội dung session cookie (chuẩn JWE) — chọn nó thay vì module crypto của Node vì middleware có thể chạy ở edge runtime. Test bằng Vitest, môi trường Node thuần (không cần jsdom vì toàn logic phía server). Xem [Client handbook](../apps/client/README.md).

## Hạ tầng chạy kèm (Docker)

| Thành phần     | Dùng để làm gì                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| **PostgreSQL** | Cơ sở dữ liệu chính, đồng thời là nơi đặt bảng outbox.                                                 |
| **Redis**      | Phiên refresh, cache, hàng đợi BullMQ và pub/sub cho realtime.                                         |
| **Maildev**    | Máy chủ SMTP giả ở local: bắt mọi email hệ thống gửi ra và hiển thị trên web, không gửi thật ra ngoài. |
