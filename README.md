# 🚀 Turborepo Advanced Starter Kit Enterprise

Dự án này là một **Enterprise Monorepo Starter Kit** chuẩn mực và hoàn chỉnh, sử dụng **Turborepo** & **PNPM Workspace** để quản lý đa ứng dụng và đa gói dùng chung (Shared Packages). Hệ thống áp dụng các chuẩn kiến trúc hiện đại nhất hiện nay: **Clean Architecture**, **Domain-Driven Design (DDD)**, **CQRS**, **Event-Driven Architecture (EDA)**, **Hybrid JWT Auth (Stateless Access + Stateful Refresh)**.

---

## 📌 1. Danh Mục Tài Liệu Hướng Dẫn (Navigation Hub)

Để tiện tra cứu nhanh trên GitHub, dưới đây là bộ tài liệu hoàn chỉnh cho từng thành phần trong Monorepo:

* 🎓 **[Tài liệu Giáo khoa Kiến trúc & Mẫu thiết kế (Master Architecture Guide)](docs/architecture.md)**: Giải thích chi tiết Clean Architecture, DDD, CQRS, EDA, Stateless vs Stateful Auth & Resilience Patterns.
* 🖥️ **[Tài liệu Admin Dashboard Portal (`apps/admin`)](apps/admin/README.md)**: Cấu trúc Feature-Based, Token Refresh Interceptor, Zustand Stores & Realtime Socket.io.
* 💻 **[Tài liệu Backend API Server (`apps/server`)](apps/server/README.md)**: Hướng dẫn cấu hình máy chủ NestJS, Swagger Docs, Caching & Background Workers.
  * 🛡️ **[Bounded Context Auth](apps/server/src/contexts/iam/auth/README.md)**: Luồng Login, Token Rotation, Revoke Session & Redis Store.
  * 👤 **[Bounded Context Users](apps/server/src/contexts/iam/users/README.md)**: Quản lý User Entity, Cache Invalidation & BullMQ Worker.
  * 🔑 **[Bounded Context Roles](apps/server/src/contexts/iam/roles/README.md)**: Quản lý RBAC System & Permission Utilities.
  * 📋 **[Bounded Context Audit Logs](apps/server/src/contexts/audit/README.md)**: Ghi log vết tuân thủ tự động toàn hệ thống.

---

## 📐 2. Cấu Trúc Tổng Quan Monorepo (Workspace Architecture)

Monorepo được phân chia làm 2 khu vực chính: **`apps/`** (các ứng dụng đầu cuối) và **`packages/`** (các thư viện/config dùng chung).

```text
turborepo-advanced-starter/
├── apps/
│   ├── server/                 # Backend API Server (NestJS, Clean Architecture, DDD, CQRS)
│   ├── admin/                  # Admin Dashboard Web Portal (React 19, Vite, TailwindCSS, Shadcn UI)
│   └── client/                 # Client Web Application (Next.js App Router)
│
├── packages/
│   ├── contracts/              # Shared DTOs, Permissions, API Specs & Permission Utils
│   ├── database/               # Prisma Schema, Database Migrations, Client Export
│   ├── types/                  # Shared TypeScript Core Type Definitions
│   ├── eslint-config/          # Standardized Shared ESLint Rules
│   └── typescript-config/      # Base tsconfig.json Configurations
│
├── docs/                       # Master Architecture & Design Patterns Guide
├── docker-compose.yml          # Local Infrastructure (PostgreSQL 16 & Redis Stack 7)
├── turbo.json                  # Turborepo Build & Task Pipeline Config
├── pnpm-workspace.yaml         # PNPM Monorepo Workspace Definition
└── README.md                   # Tài liệu hướng dẫn cấp cao Monorepo
```

---

## 🏢 3. Tổng Quan Các Gói & Ứng Dụng Trong Monorepo

### 3.1. Các Ứng Dụng (`apps/`)
- **`apps/server`**: Máy chủ NestJS Backend theo chuẩn Clean Architecture & DDD. Đảm nhận toàn bộ API, Authentication, Authorization, Database Persistence & Realtime WebSockets.
- **`apps/admin`**: Trang quản trị Single Page Application (SPA) xây dựng bằng React 19 + Vite. Quản lý Users, Roles, Audit Logs, Active Sessions & Dashboard Stats.
- **`apps/client`**: Trang Web Portal dành cho người dùng cuối xây dựng bằng Next.js App Router.

### 3.2. Các Gói Dùng Chung (`packages/`)
- **`@repo/contracts`**: Gói hợp đồng dùng chung giữa Frontend và Backend. Chứa danh sách `PERMISSIONS`, `PermissionType`, và các hàm utility so sánh quyền (`hasAllPermissions`, `hasPermission`).
- **`@repo/database`**: Chứa Prisma Schema, Migrations PostgreSQL và xuất Prisma Client cho toàn bộ dự án.
- **`@repo/types`**: Chứa các TypeScript Types & Interfaces toàn cục.
- **`@repo/eslint-config` & `@repo/typescript-config`**: Cấu hình chuẩn hóa Linter & TypeScript compiler chung.

---

## 🏛️ 4. Cấu Trúc Kiến Trúc Backend (`apps/server`)

Nguồn mã Backend NestJS được tổ chức thành 4 lớp rõ ràng:

```text
apps/server/src/
├── contexts/                   # 1. BOUNDED CONTEXTS (Logic nghiệp vụ miền)
│   ├── iam/                    # Identity & Access Management (Auth, Users, Roles)
│   ├── audit/                  # Audit Log Compliance Engine (Độc lập với IAM)
│   ├── analytics/              # Dashboard & Business Analytics
│   ├── storage/                # File Upload & Media Asset Management
│   ├── menu/                   # Dynamic Navigation Management
│   └── notifications/          # Realtime & System Notifications
│
├── infrastructure/             # 2. TECHNICAL INFRASTRUCTURE DRIVERS & ADAPTERS
│   ├── database/               # PrismaModule & PrismaService Connection
│   ├── cache/                  # RedisModule, RedisService & Cache Interceptors
│   ├── queue/                  # QueueModule & BullMQ Job Adapters
│   ├── realtime/               # RealtimeModule & Socket.io WebSockets Gateway
│   └── event-bus/              # Domain Event Dispatcher & Infrastructure Bridges
│
├── presentation/               # 3. HTTP FRAMEWORK BUILDING BLOCKS
│   ├── common/                 # Common DTOs (PaginationQueryDto) & Presenters
│   ├── decorators/             # Custom Decorators (@GetUser, @ClientInfo, @AuditLog)
│   ├── guards/                 # HTTP Guards (JwtAuthGuard, JwtRefreshAuthGuard, PermissionsGuard)
│   ├── filters/                # DomainExceptionFilter
│   └── interceptors/           # AuditLogInterceptor
│
└── shared/                     # 4. PURE SHARED KERNEL (Zero Framework Dependency)
    ├── domain/                 # Base AggregateRoot, Result<T,E>, DomainException & Ports
    └── constants/              # System Domain Constants
```

---

## 🛠️ 5. Hướng Dẫn Khởi Chạy Nhanh (Quick Start)

### 5.1. Cài đặt Phụ thuộc & Môi trường
```bash
# Cài đặt toàn bộ node_modules trong Monorepo
pnpm install

# Tạo file .env từ template
cp .env.example .env
```

### 5.2. Khởi động Infrastructure (Database & Cache)
```bash
# Khởi chạy Postgres (Port 5432) & Redis (Port 6380) qua Docker
docker-compose up -d

# Sync Prisma Schema và sinh Prisma Client
pnpm db:generate
pnpm db:push
```

### 5.3. Khởi chạy Môi trường Phát triển (Development)
```bash
# Run tất cả apps (Server, Client, Admin) đồng thời qua Turborepo
pnpm dev
```
* **API Server**: [http://localhost:3001](http://localhost:3001) (Swagger API Docs tại [/api](http://localhost:3001/api))
* **Admin Dashboard**: [http://localhost:3000](http://localhost:3000)
* **Client App**: [http://localhost:3002](http://localhost:3002)
