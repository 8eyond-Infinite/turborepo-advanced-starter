# Turborepo Advanced Starter Kit (Vietnamese Edition)

Dự án này là một **Monorepo Starter Kit** hoàn chỉnh và nâng cao sử dụng **Turborepo** để quản lý cấu trúc đa dự án (Multiproject), tích hợp đầy đủ công nghệ tốt nhất để xây dựng ứng dụng Web & API Server hiệu năng cao:

*   **API Server (`apps/server`)**: NestJS áp dụng **Clean Architecture**, **DDD (Domain-Driven Design)**, **CQRS**, **EDA**, **Redis Caching**, và **BullMQ Worker**.
*   **Web Portal (`apps/client` & `apps/admin`)**: Các frontend apps sẵn sàng hoạt động.
*   **Shared Packages (`packages/database`)**: Kết nối PostgreSQL sử dụng Prisma, dùng chung schema và migrations trên toàn monorepo.

---

## 1. Bản Đồ Tài Liệu Hướng Dẫn Chi Tiết

Để thuận tiện cho việc đọc và tra cứu trực tiếp trên GitHub, hệ thống tài liệu tiếng Việt đã được phân chia như sau:

*   📖 **[Tài liệu chi tiết kiến trúc & các luồng xử lý chính](https://github.com/8eyond-Infinite/turborepo-advanced-starter/blob/main/docs/architecture.md)**: Giải thích sâu về Clean Architecture, cấu trúc thư mục, các mẫu thiết kế (Value Objects, Aggregate Root, Result Pattern, Event-Driven Architecture) và luồng chạy thực tế.
*   💻 **[Tài liệu chi tiết Backend API Server](https://github.com/8eyond-Infinite/turborepo-advanced-starter/blob/main/apps/server/README.md)**: Hướng dẫn cấu hình, cài đặt, chạy test và API Swagger UI cho gói máy chủ Backend.
*   🛡️ **[Tài liệu Bounded Context Xác thực (Auth)](https://github.com/8eyond-Infinite/turborepo-advanced-starter/blob/main/apps/server/src/contexts/iam/auth/README.md)**: Luồng đăng nhập, Whitelist & Rotation Refresh Token, Đăng xuất/Đăng xuất toàn cầu với Redis.
*   👤 **[Tài liệu Bounded Context Người dùng (Users)](https://github.com/8eyond-Infinite/turborepo-advanced-starter/blob/main/apps/server/src/contexts/iam/users/README.md)**: Quản lý thực thể User, vai trò phân quyền RBAC và cơ chế Tự động hủy cache (Cache Invalidation).

---

## 2. Hướng Dẫn Chạy Dự Án Nhanh (Quick Start)

### 2.1. Cài đặt các gói phụ thuộc
Tại thư mục gốc của Monorepo:
```bash
pnpm install
```

### 2.2. Khởi động PostgreSQL và Redis
Chạy container Docker được cấu hình sẵn:
```bash
pnpm db:up
```

### 2.3. Khởi chạy toàn bộ môi trường Dev
Chạy đồng thời tất cả các frontend apps, admin panel và backend server:
```bash
pnpm dev
```

### 2.4. Chạy kiểm thử tự động (E2E Tests)
Kiểm tra tính đúng đắn của toàn bộ luồng nghiệp vụ của Server:
```bash
pnpm --filter=server test:e2e
```
