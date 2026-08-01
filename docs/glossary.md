# Bảng thuật ngữ (Glossary)

> **Phần I · Chương 3 — Ngôn ngữ chung của dự án**
>
> Chương trước: [Lộ trình học](getting-started-path.md) · [Mục lục handbook](README.md) · Chương sau: [Công cụ và thư viện](tech-stack.md)

Đây là từ điển tra cứu, không phải chương cần học thuộc. Khi một chương nói “aggregate”, “composition root” hay “refresh rotation”, hãy tìm thuật ngữ ở đây, đọc nghĩa cùng ví dụ trong code rồi quay lại flow đang học.

Tài liệu này định nghĩa mọi thuật ngữ được dùng trong repo bằng ngôn ngữ tự nhiên, mỗi thuật ngữ kèm một ví dụ cụ thể lấy từ chính codebase. Đọc lướt một lần trước khi đọc các handbook; quay lại tra khi gặp từ lạ.

Mẹo ghi chép: cột "Hiểu đơn giản là" chính là phần đáng chép vào sổ tay nhất.

## Quy ước viết tài liệu của repo

Phần dưới đây là bản tóm tắt dành cho người đọc. Tác giả và reviewer xem bản đầy đủ tại [Quy chuẩn viết tài liệu](documentation-style-guide.md).

Áp dụng cho mọi tài liệu tiếng Việt trong repo, để người mới không bị chặn bởi thuật ngữ:

1. Thuật ngữ tiếng Anh đã thành chuẩn ngành (token, transaction, commit, cache, queue…) được giữ nguyên — nhưng câu chứa nó phải mô tả hành động cụ thể. Phép thử: che thuật ngữ đi, câu vẫn phải cho biết "ai làm gì với cái gì".
2. Không dùng chuỗi danh từ tiếng Anh làm vị ngữ ("chuyển hành vi session thành cache operations"). Viết hành động thật: "đọc/ghi các key Redis lưu phiên đăng nhập".
3. Thuật ngữ khó xuất hiện lần đầu trong một file phải kèm giải thích ngắn trong ngoặc, hoặc có mặt trong bảng dưới đây.
4. Một câu chỉ nén một ý; câu dài quá thì tách đôi.

## A. Monorepo và tooling

| Thuật ngữ                   | Hiểu đơn giản là                                                                                                              | Trong repo này                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Monorepo                    | Một repository chứa nhiều ứng dụng và thư viện, quản lý chung một chỗ thay vì mỗi thứ một repo.                               | `apps/server`, `apps/admin`, `apps/client` và 5 package trong `packages/` sống chung một repo.                      |
| Workspace                   | Cách pnpm biết "trong repo này có những package nào". Mỗi thư mục có `package.json` là một workspace member.                  | `pnpm-workspace.yaml` khai báo `apps/*` và `packages/*`.                                                            |
| Workspace dependency        | Package trong repo phụ thuộc package khác trong cùng repo, không cần publish lên npm.                                         | `apps/server` khai báo `"@repo/database": "workspace:*"`.                                                           |
| Task graph                  | Turborepo hiểu task nào phải chạy trước task nào. Package dùng chung phải build xong trước app tiêu thụ nó.                   | Trong `turbo.json`, task `lint` có `dependsOn: ["^build"]` — lint server sẽ tự build `@repo/database` trước.        |
| Quality gate                | Bộ lệnh kiểm tra bắt buộc phải xanh trước khi code được merge: lint, typecheck, test, build.                                  | `pnpm turbo run lint check-types test build` — CI chạy đúng chuỗi này.                                              |
| CI (Continuous Integration) | Máy chủ tự động chạy quality gate trên mỗi commit đẩy lên. Không phụ thuộc "máy tao chạy được".                               | `.github/workflows/ci.yml` — job `quality` và job `e2e`.                                                            |
| CD (Continuous Delivery)    | Tự động tạo artifact đã kiểm tra và giữ nó ở trạng thái sẵn sàng triển khai; con người vẫn quyết định lúc đưa lên production. | CI đẩy image theo SHA lên GHCR; release workflow gắn version. Repo không tự deploy production.                      |
| Git hook                    | Script chạy tự động quanh thao tác git, chặn commit bẩn từ máy dev.                                                           | `.husky/pre-commit` chạy lint-staged (format code); `.husky/commit-msg` bắt commit message theo chuẩn conventional. |

## B. Kiến trúc backend

| Thuật ngữ                  | Hiểu đơn giản là                                                                                                                | Trong repo này                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Modular monolith           | Deploy như một app duy nhất, nhưng code bên trong chia ranh giới rõ như nhiều module độc lập.                                   | Toàn bộ NestJS server là một process, chia thành các context: IAM, Audit, Notifications…                                       |
| Bounded context            | Một "lãnh thổ nghiệp vụ" sở hữu model và luật riêng. Context khác không được thò tay vào dữ liệu nội bộ của nó.                 | `src/contexts/iam/` sở hữu user/role/auth; `src/contexts/audit/` chỉ được gọi IAM qua cổng công khai.                          |
| Layer (tầng)               | Mỗi context chia 4 tầng: Domain (luật nghiệp vụ), Application (use case), Infrastructure (DB/Redis/queue), Presentation (HTTP). | Thư mục con `domain/`, `application/`, `infrastructure/`, `presentation/` trong mỗi context.                                   |
| Dependency direction       | Quy tắc: tầng ngoài được biết tầng trong, tầng trong không được biết tầng ngoài. Domain là trong cùng.                          | Test kiến trúc `src/architecture/dependency-rules.spec.ts` fail nếu domain import Prisma/NestJS.                               |
| Entity                     | Object nghiệp vụ có danh tính (id) và vòng đời. So sánh bằng id, không phải bằng giá trị field.                                 | `UserEntity` — hai user cùng email vẫn là hai entity khác nhau nếu khác id.                                                    |
| Aggregate                  | Cụm entity được sửa đổi như một khối duy nhất, có một "gốc" điều khiển mọi thay đổi.                                            | `UserEntity` là aggregate root; muốn đổi role của user phải đi qua method của nó, không sửa lẻ bảng `user_roles`.              |
| Value object               | Object không có danh tính, chỉ có giá trị, và tự validate mình khi khởi tạo.                                                    | `Email`, `Password`, `Username` trong `iam/users/domain/value-objects/` — tạo `Email` với chuỗi sai định dạng sẽ ném lỗi ngay. |
| Invariant                  | Luật mà aggregate cam kết luôn đúng, bất kể ai gọi.                                                                             | "User bị deactivate thì mọi access token cũ phải chết" — được giữ bằng `tokenVersion++` bên trong entity.                      |
| Port                       | Interface do domain/application định nghĩa: "tôi cần một thứ làm được việc X", không quan tâm ai làm.                           | `UserRepository`, `ISessionStore`, `ICachePort` trong các thư mục `ports/`.                                                    |
| Adapter                    | Class ở tầng infrastructure cắm vào port: "tôi chính là thứ làm việc X, bằng Prisma/Redis/S3".                                  | `PrismaUserRepository` cắm vào port `UserRepository`; `RedisSessionStore` cắm vào `ISessionStore`.                             |
| Repository                 | Port chuyên trách đọc/ghi aggregate từ storage, trả về entity chứ không trả raw database row.                                   | `PrismaUserRepository.findById()` trả `UserEntity`, không trả Prisma record.                                                   |
| Presenter                  | Nơi quyết định response trả ra ngoài có những field nào — theo kiểu allowlist (chỉ cho ra thứ được liệt kê).                    | `UserPresenter.toResponse()` không bao giờ trả `password` hay `tokenVersion`.                                                  |
| DTO (Data Transfer Object) | Class mô tả hình dạng dữ liệu vào/ra ở biên HTTP, gắn rule validate.                                                            | `RegisterDto` với `@IsEmail()`, `@MinLength(6)` — request sai bị chặn trước khi chạm vào handler.                              |

## C. CQRS và event

| Thuật ngữ              | Hiểu đơn giản là                                                                                                                                                      | Trong repo này                                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| CQRS                   | Tách code đọc (query) và code ghi (command) thành hai đường riêng, mỗi đường một handler. Không phải hai database.                                                    | `GetUsersQueryHandler` (đọc) và `DeactivateUserHandler` (ghi) là hai class độc lập.                                 |
| Command                | Yêu cầu làm thay đổi hệ thống. Đặt tên theo ý định nghiệp vụ, không theo CRUD.                                                                                        | `DeactivateUserCommand`, `RevokeSessionCommand`.                                                                    |
| Query                  | Yêu cầu đọc dữ liệu, cam kết không gây side effect nghiệp vụ.                                                                                                         | `GetUsersQuery`, `GetAuditLogsQuery`.                                                                               |
| Handler                | Class thực thi một command hoặc query duy nhất. Controller chỉ dựng command/query rồi ném vào bus.                                                                    | `LoginCommandHandler.execute()` chứa toàn bộ logic đăng nhập.                                                       |
| Domain event           | Sự kiện "chuyện gì đó vừa xảy ra trong nghiệp vụ", phát ra từ aggregate, để phần khác của hệ thống phản ứng.                                                          | `UserRegisteredEvent` → gửi mail chào mừng; `UserDeactivatedEvent` → force logout realtime.                         |
| Transactional outbox   | Kỹ thuật ghi event vào một bảng trong CÙNG transaction với dữ liệu chính, rồi một tiến trình nền đọc bảng đó và phát event đi. Đảm bảo "đã lưu là chắc chắn sẽ phát". | Bảng `outbox_events`; `OutboxPublisherService` poll mỗi 100ms, claim row `PENDING`, phát xong đánh dấu `PUBLISHED`. |
| At-least-once delivery | Event được đảm bảo phát "ít nhất một lần" — nghĩa là có thể bị phát trùng. Bên nhận phải chịu được xử lý lặp.                                                         | Router dùng `jobId = eventId` khi đẩy vào BullMQ để job trùng bị queue bỏ qua.                                      |
| Idempotent             | Thao tác chạy 2 lần cho kết quả y như chạy 1 lần. Điều kiện bắt buộc của bên tiêu thụ event at-least-once.                                                            | Seed menu chỉ chạy khi bảng rỗng — chạy lại seed không nhân đôi menu.                                               |

## D. Auth và bảo mật

| Thuật ngữ                | Hiểu đơn giản là                                                                                                              | Trong repo này                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Access token             | JWT sống ngắn (15 phút) gửi kèm mỗi request để chứng minh "tôi là ai, tôi được làm gì".                                       | Header `Authorization: Bearer <token>`; payload chứa `sub`, `permissions`, `tokenVersion`. |
| Refresh token            | JWT sống dài (7 ngày) chỉ dùng cho một việc: xin access token mới khi cái cũ hết hạn.                                         | `POST /auth/refresh` với refresh token trong header Bearer.                                |
| JTI                      | Số định danh duy nhất của một refresh token — như "số serial" in trên từng vé.                                                | Redis lưu key `refresh_token:{userId}:{jti}`; thu hồi một phiên = xóa đúng key đó.         |
| Refresh rotation         | Mỗi lần refresh, server cấp refresh token MỚI và hủy cái CŨ. Token cũ bị đánh cắp cũng chỉ dùng được đến lần refresh kế tiếp. | `RefreshCommandHandler` save JTI mới rồi revoke JTI cũ.                                    |
| tokenVersion             | Số phiên bản gắn trên user. Bump số này = mọi access token đã phát (chứa số cũ) chết ngay lập tức, không cần đợi hết hạn.     | `logout/global` và `deactivate` đều gọi `revokeAccessTokens()` để `tokenVersion++`.        |
| RBAC                     | Phân quyền theo vai trò: user có role, role có permission, code chỉ hỏi "có permission X không".                              | Chuỗi permission dạng `user:create` định nghĩa tập trung ở `@repo/contracts`.              |
| Guard                    | "Người gác cổng" của NestJS — chặn request trước khi vào controller nếu chưa đủ điều kiện.                                    | `JwtAuthGuard` (phải đăng nhập), `PermissionsGuard` (phải có đủ permission).               |
| Rate limiting / throttle | Giới hạn số request mỗi IP trong một khoảng thời gian, chống brute-force và spam.                                             | `@nestjs/throttler`: mặc định 100/phút, riêng login/register 5/phút.                       |
| CORS                     | Cơ chế trình duyệt hỏi server "origin này có được phép gọi anh không". Server chỉ trả lời cho danh sách origin tin cậy.       | `CORS_ORIGINS=http://localhost:5173,http://localhost:3005` — áp cho cả HTTP lẫn Socket.IO. |
| Helmet                   | Middleware gắn các HTTP security header chuẩn (chống clickjacking, sniffing…).                                                | `app.use(helmet(...))` trong `main.ts`.                                                    |

## E. Frontend (Admin)

| Thuật ngữ                | Hiểu đơn giản là                                                                                                                                           | Trong repo này                                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Feature-slice            | Tổ chức code theo tính năng nghiệp vụ (users, roles…), mỗi feature một thư mục tự chứa api/hooks/components.                                               | `src/features/users/` có `api/`, `hooks/`, `components/` riêng.                                             |
| API adapter              | File duy nhất trong feature được phép biết endpoint URL. Component/hook không bao giờ gọi `fetch` thẳng.                                                   | `features/users/api/user.api.ts` — mọi endpoint `/users/*` nằm ở đây.                                       |
| Query key                | "Địa chỉ nhà" của một mảnh dữ liệu trong cache TanStack Query. Cùng key = cùng cache.                                                                      | `userKeys.list({page: 1, limit: 10, search: ""})` → `["users", "list", {...}]`.                             |
| Query key factory        | File tập trung sản xuất query key để không ai gõ key bằng tay (gõ sai một ký tự là cache sai).                                                             | `features/users/api/user.keys.ts`.                                                                          |
| Invalidation             | Báo cho cache "dữ liệu nhóm này cũ rồi, lần tới ai cần thì fetch lại".                                                                                     | Sau khi tạo user: `queryClient.invalidateQueries({ queryKey: userKeys.all })`.                              |
| Server state vs UI state | Server state = dữ liệu của backend (cache bằng TanStack Query). UI state = trạng thái tương tác cục bộ (useState). Session auth = Zustand. Không trộn lẫn. | Danh sách user thuộc TanStack Query; ô search đang gõ thuộc `useState`; phiên đăng nhập thuộc `auth.store`. |
| Single-flight refresh    | Khi 5 request cùng dính 401, chỉ MỘT request refresh token được bắn đi, 4 cái còn lại đợi chung kết quả.                                                   | `ApiClient.refreshPromise` trong `lib/api-client.ts` — có unit test chứng minh.                             |
| Permission gating        | Ẩn/hiện UI theo quyền — nhưng chỉ là trải nghiệm; chốt chặn thật nằm ở backend.                                                                            | `<Can I={PERMISSIONS.USER.DELETE}>` bọc nút xóa; backend vẫn kiểm tra lại.                                  |

## F. Database và vận hành

| Thuật ngữ                  | Hiểu đơn giản là                                                                                                                       | Trong repo này                                                                                           |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Migration                  | File SQL được đánh số thứ tự, ghi lại LỊCH SỬ thay đổi schema. Môi trường mới dựng DB bằng cách chạy lại toàn bộ lịch sử.              | `packages/database/prisma/migrations/`; CI chạy `pnpm verify:migrations` để replay và bắt drift.         |
| `db push`                  | Đồng bộ schema thẳng vào DB, KHÔNG ghi lịch sử. Chỉ dành cho database vứt đi (test).                                                   | Global setup của e2e dùng `db push --force-reset` lên database `*_test`.                                 |
| Baseline                   | Đánh dấu "DB này đã tương đương với N migration đầu" mà không chạy lại chúng — dùng khi DB có trước lịch sử migration.                 | DB dev local được baseline bằng `prisma migrate resolve --applied`.                                      |
| Seed                       | Script bơm dữ liệu khởi tạo (permission, role, admin đầu tiên) — phải idempotent và không phá dữ liệu có sẵn.                          | `prisma/seed.ts`: cần `SEED_ADMIN_PASSWORD`, không bao giờ reset mật khẩu admin có sẵn.                  |
| Liveness / readiness probe | Hai câu hỏi khác nhau: "process còn sống không?" (liveness) và "đã sẵn sàng nhận traffic chưa?" (readiness — DB, Redis nối được chưa). | `GET /health/live` và `GET /health/ready`.                                                               |
| Structured logging         | Log dạng JSON có field (level, time, correlationId…) để máy đọc/lọc được, thay vì chuỗi văn bản tự do.                                 | pino qua `nestjs-pino`; dev in màu dễ đọc, production in JSON.                                           |
| Correlation ID             | Mã định danh gắn theo một request xuyên suốt các log line, để lần được toàn bộ dấu vết của đúng request đó.                            | Header `x-correlation-id` — client gửi thì dùng lại, không gửi thì server tự sinh.                       |
| Metrics / Prometheus       | Số liệu đo được (đếm, thời lượng) mà hệ thống giám sát kéo về định kỳ qua một endpoint text.                                           | `GET /metrics`: HTTP latency, outbox lag, BullMQ và tuổi backup; production dùng Bearer `METRICS_TOKEN`. |
| Graceful shutdown          | Khi nhận lệnh tắt, app ngừng nhận việc mới, làm nốt việc dở, đóng kết nối rồi mới thoát.                                               | `app.enableShutdownHooks()`; outbox publisher drain poll đang chạy trước khi tắt.                        |
