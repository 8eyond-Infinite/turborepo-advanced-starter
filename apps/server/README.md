# Backend Architecture Guide

Tài liệu này mô tả kiến trúc của backend trong `apps/server` theo cách đủ chi tiết để một người mới có thể:

- hiểu hệ thống được chia như thế nào
- biết từng lớp chịu trách nhiệm gì
- lần theo luồng nghiệp vụ từ HTTP vào domain rồi ra infrastructure
- đọc code theo đúng thứ tự thay vì mở file ngẫu nhiên

Mục tiêu của tài liệu này là giải thích kiến trúc thật của codebase hiện tại, không phải mô tả lý thuyết chung chung.

## 1. One-sentence summary

Backend này là một NestJS application được tổ chức theo modular monolith style, bên trong áp dụng Clean Architecture / Hexagonal Architecture, DDD, CQRS, domain events, Redis-backed session/cache, BullMQ jobs, Prisma persistence, và một số cross-cutting concern như audit, realtime, notifications.

Nếu phải nói gọn trong một câu:

> HTTP đi vào `presentation`, use case chạy ở `application`, luật nghiệp vụ nằm ở `domain`, còn tích hợp kỹ thuật nằm ở `infrastructure`.

## 2. Architectural goals

Kiến trúc này đang cố đạt mấy mục tiêu chính:

1. Tách rõ nghiệp vụ khỏi chi tiết kỹ thuật.
2. Giảm coupling giữa các bounded context.
3. Giữ cho luồng đọc và luồng ghi dễ theo dõi.
4. Cho phép cache, queue, realtime, audit hoạt động như các side effect tách biệt.
5. Làm cho code dễ test hơn vì phần lớn business logic không phụ thuộc trực tiếp vào HTTP hay database framework.

Nói theo kiểu thực dụng:

- đổi cách lưu dữ liệu thì domain không nên phải đổi
- đổi cách auth session hoạt động thì controller không nên phải đổi nhiều
- đổi response format của frontend thì use case không nên đổi

## 3. High-level structure

Cấu trúc lớn của backend:

```text
apps/server/src
├── main.ts
├── app.module.ts
├── app.controller.ts
├── app.service.ts
├── shared/
└── contexts/
```

### `main.ts`

Bootstrap toàn bộ NestJS app. File này quyết định:

- app khởi động bằng module nào
- global validation hoạt động ra sao
- CORS cấu hình thế nào
- static assets có được serve không
- Swagger có được bật không
- error mapping toàn cục hoạt động thế nào

### `app.module.ts`

Root module của application. Đây là nơi lắp các nền tảng chung và các bounded context vào runtime.

### `shared/`

Nơi chứa các thành phần dùng chung giữa nhiều bounded context.

### `contexts/`

Nơi chứa toàn bộ bounded context nghiệp vụ:

- `iam`
- `analytics`
- `audit`
- `menu`
- `notifications`
- `storage`

## 4. Layered architecture

Codebase này có thể đọc tốt nhất theo 4 lớp:

```text
presentation -> application -> domain -> infrastructure
```

### 4.1 Presentation

Lớp đầu vào của HTTP.

Thường gồm:

- controller
- dto
- presenter
- guards/decorators dùng ở endpoint

Vai trò:

- nhận request
- validate input
- map request sang command/query
- gọi handler/use case
- map kết quả thành HTTP response

Lớp này không nên chứa nghiệp vụ nặng.

### 4.2 Application

Lớp điều phối use case.

Thường gồm:

- commands
- queries
- handlers
- queue processors
- event handlers

Vai trò:

- phối hợp các bước của một nghiệp vụ
- gọi domain entity / value object
- gọi repository port
- phát domain event
- trả `Result`

Đây là nơi bạn nên tìm câu trả lời cho câu hỏi:

- use case này làm gì trước, làm gì sau?
- khi thành công thì side effect nào xảy ra?
- khi thất bại thì lỗi nào được map ra?

### 4.3 Domain

Lõi nghiệp vụ.

Thường gồm:

- entity
- value object
- domain event
- exception
- repository port
- port interface cho các dependency quan trọng

Domain mô tả “sự thật nghiệp vụ” của hệ thống.
Domain không nên biết:

- Prisma
- Redis
- HTTP
- NestJS controller

### 4.4 Infrastructure

Lớp hiện thực kỹ thuật.

Thường gồm:

- Prisma repository
- Redis session store
- BullMQ adapter
- realtime gateway/service
- cache adapter / interceptor
- storage adapters

Infrastructure trả lời câu hỏi:

- lưu ở đâu?
- cache ở đâu?
- đẩy job kiểu gì?
- phát realtime ra sao?

## 5. Dependency direction

Một nguyên tắc rất quan trọng của project này là hướng phụ thuộc đi từ ngoài vào trong.

```text
presentation -> application -> domain
infrastructure -> domain ports
shared -> phục vụ nhiều nơi, nhưng không nên kéo domain phụ thuộc ngược lại vào kỹ thuật
```

### Điều này có nghĩa là

- controller không nên query DB trực tiếp nếu đã có use case phù hợp
- application nên phụ thuộc vào abstraction thay vì concrete implementation
- infrastructure được phép implement các interface do domain/application định nghĩa
- domain không nên import thứ gì mang tính runtime của framework

### Tại sao quan trọng

Nếu đi đúng hướng này:

- thay DB không làm vỡ core logic
- thay cache hoặc queue backend không làm vỡ use case
- test domain/application sẽ dễ hơn
- project mở rộng sẽ ít bị rối

## 6. Runtime flow

Một request điển hình thường đi qua các lớp sau:

```mermaid
flowchart LR
    Client[Client] --> Controller[Presentation Controller]
    Controller --> DTO[DTO / Validation Pipe]
    DTO --> Handler[Application Handler]
    Handler --> Domain[Domain Entity / Value Object]
    Handler --> Repo[Repository Port]
    Repo --> Infra[Infrastructure Adapter]
    Infra --> DB[(Prisma / Postgres)]
    Handler --> Events[Domain Event Dispatcher]
    Events --> Bridges[Cache / Queue / Realtime Bridges]
    Controller --> Presenter[Presenter / Response Mapping]
    Presenter --> Client
```

### 6.1 Happy path

Luồng bình thường:

1. Client gửi HTTP request.
2. Controller nhận request.
3. Validation pipe kiểm tra input.
4. Application handler chạy use case.
5. Domain entity/value object enforce rule.
6. Repository port được gọi nếu cần đọc/ghi dữ liệu.
7. Infrastructure adapter chạm database hoặc service ngoài.
8. Domain event được phát nếu nghiệp vụ có side effect.
9. Controller trả JSON response.

### 6.2 Side effects

Không phải tất cả hậu quả của một nghiệp vụ đều xảy ra ngay trong request chính.

Một số side effect được tách ra:

- notification
- cache invalidation
- realtime push
- background job
- audit log

Điều này giúp request chính nhẹ hơn và giữ cho logic business không bị trộn với hạ tầng phụ.

### 6.3 Error flow

Lỗi trong hệ thống thường chia 2 nhóm:

- lỗi nghiệp vụ: input sai, entity không hợp lệ, không đủ quyền, object không tồn tại
- lỗi kỹ thuật: DB lỗi, Redis lỗi, queue lỗi, runtime lỗi

Domain errors được map thành HTTP errors qua `DomainExceptionFilter`.
Nhờ vậy controller không phải tự viết rất nhiều `try/catch`.

## 7. App bootstrap

### 7.1 `main.ts`

File này là điểm khởi động thực sự của application.

Nó đang làm các việc chính:

- tạo Nest app
- serve static uploads từ `public`
- bật CORS
- gắn global validation pipe
- gắn global domain exception filter
- tạo Swagger document
- mount Swagger UI tại `/api`
- start server

Ý nghĩa kiến trúc:

- đây là nơi xử lý concern cấp platform
- đây không phải nơi đặt business rule

### 7.2 `app.module.ts`

File này lắp toàn bộ hệ thống vào một runtime shell.

Nó import:

- `ConfigModule`
- `PrismaModule`
- `RedisModule`
- `QueueModule`
- `EventDispatcherModule`
- `RealtimeModule`
- `IamModule`
- `AnalyticsModule`
- `StorageModule`
- `MenuModule`
- `NotificationModule`
- `AuditLogModule`

Nó cũng đăng ký `AuditLogInterceptor` ở cấp toàn cục.

Ý nghĩa:

- audit log không phải feature cục bộ của một controller
- nó là concern xuyên suốt request lifecycle

## 8. Shared foundation

`shared/` là nơi chứa các mảnh nền dùng chung.

### 8.1 `shared/domain`

Đây là phần lõi dùng chung cho mô hình nghiệp vụ:

- `aggregate-root.ts`
- `result.ts`
- domain event contracts
- common exceptions
- common ports

#### `aggregate-root.ts`

Base class cho aggregate root.
Thường dùng để:

- giữ state của aggregate
- thu thập domain events
- phát event khi state thay đổi

#### `result.ts`

Wrapper cho kết quả xử lý nghiệp vụ.

Ý tưởng:

- handler không chỉ throw lỗi một cách bừa bãi
- handler có thể trả về trạng thái thành công/thất bại rõ ràng
- controller unwrap và để filter xử lý lỗi nếu cần

#### domain events

Các interface / base model cho event giúp hệ thống có một chuẩn chung để:

- phát event
- xử lý event
- bridge sang cache/queue/realtime

### 8.2 `shared/application`

Chứa service điều phối event domain.

#### `domain-event-dispatcher.ts`

Nhận events từ aggregate root / application và phát chúng ra cơ chế xử lý tương ứng.

Điểm quan trọng:

- use case chính không cần biết listener nào sẽ phản ứng
- event handler có thể được thêm vào sau
- side effects được tách ra khỏi core logic

### 8.3 `shared/infrastructure`

Đây là bộ công cụ kỹ thuật dùng chung.

Các nhóm chính:

- `cache/`
- `decorators/`
- `event/`
- `filters/`
- `guards/`
- `interceptors/`
- `prisma/`
- `queue/`
- `realtime/`
- `dto/`
- `presenters/`

#### Cache

Cache layer hỗ trợ:

- lưu cache
- invalidation
- intercept response
- bridge event -> cache behavior

#### Guards / decorators

Chứa các helper như:

- lấy user hiện tại
- kiểm tra permission
- đọc auth info từ request

#### Filters

`DomainExceptionFilter` là lớp map lỗi nghiệp vụ sang HTTP status code phù hợp.

#### Interceptors

`AuditLogInterceptor` là ví dụ điển hình cho cross-cutting concern được gắn toàn cục.

#### Prisma

Chứa module/service kết nối Prisma với app.

#### Queue

Chứa adapter và module cho BullMQ.

#### Realtime

Chứa gateway/service/bridge để phát event realtime tới client.

## 9. Bounded contexts

### 9.1 IAM

Đây là khối lớn nhất, quản lý identity và access.

Nó tách thành 3 context con:

- `auth`
- `users`
- `roles`

#### `auth`

Xử lý:

- register
- login
- refresh token
- logout
- revoke session
- active sessions

Auth phụ thuộc rất mạnh vào:

- users
- roles/permission
- Redis session store
- JWT strategy/guards

#### `users`

Xử lý:

- tạo user
- cập nhật user
- deactivate user
- delete user
- query user
- emit user lifecycle events

Nó cũng là nơi chạm đến:

- bcrypt password hasher
- Prisma user repository
- queue cho tác vụ nền
- notification / realtime / cache bridge thông qua events

#### `roles`

Xử lý:

- create role
- update permissions
- delete role
- list roles
- list permissions

`roles` là nguồn sự thật cho permission catalog.

### 9.2 Audit

Audit context đọc lịch sử hoạt động.

Nó không phải nơi ghi log chính.
Việc ghi log được làm bởi `AuditLogInterceptor` và các cơ chế liên quan.

### 9.3 Analytics

Analytics thiên về read model và dashboard queries.

Nó thường không mang tính mutation nặng như IAM.

### 9.4 Menu

Menu context xây dựng menu data cho frontend, thường dựa trên permission hoặc cấu hình hiển thị.

### 9.5 Notifications

Notifications lắng nghe event từ các domain khác, nhất là user lifecycle.

Nó có thể:

- tạo notification
- đánh dấu đã đọc
- trả danh sách notification

### 9.6 Storage

Storage context trừu tượng hóa việc lưu file.

Có adapter local và S3.

## 10. How to read a context

Mỗi bounded context thường có cấu trúc:

```text
context/
├── *.module.ts
├── application/
├── domain/
├── infrastructure/
├── presentation/
└── README.md
```

### `*.module.ts`

Đây là file đầu tiên nên mở khi muốn hiểu module đó gắn vào app thế nào.

Nó cho thấy:

- module import gì
- module export gì
- controller nào được expose
- provider nào được đăng ký

### `presentation/`

Boundary tiếp xúc HTTP.

Đọc phần này để biết:

- endpoint nào tồn tại
- input shape là gì
- output shape ra sao
- guard/decorator nào đang bảo vệ route

### `application/`

Trái tim của use case.

Đọc phần này để hiểu:

- nghiệp vụ chạy theo thứ tự nào
- điều kiện nào dẫn đến fail
- side effect nào được kích hoạt

### `domain/`

Nơi nói chuyện bằng ngôn ngữ nghiệp vụ thật.

Đọc phần này để hiểu:

- entity có rule gì
- value object validate gì
- exception nào là exception nghiệp vụ
- port nào là abstraction trọng yếu

### `infrastructure/`

Nơi hiểu công nghệ thật.

Đọc phần này để biết:

- repository thật làm gì
- mapper chuyển đổi model thế nào
- queue/realtime/cache được gắn ra sao

## 11. Cross-cutting concerns

### 11.1 Authentication

Auth không chỉ là login.
Nó gồm:

- JWT access token
- refresh token
- session store
- guard
- strategy

Kiến trúc auth hiện tại cho thấy dự án đang ưu tiên:

- tách access token và refresh token
- lưu trạng thái session ở Redis
- kiểm soát revoke / logout theo session

### 11.2 Authorization

Authorization được xử lý bằng permission model.

Điều này thường đi qua:

- permission decorator
- permissions guard
- role catalog
- user role mapping

### 11.3 Audit

Audit là concern xuyên suốt request lifecycle.

Nó được gắn ở tầng global interceptor để:

- ghi log thành công
- theo dõi ai làm gì
- hỗ trợ truy vết nghiệp vụ

### 11.4 Cache

Cache không chỉ là optimization.
Nó là một phần của data flow.

Cache invalidation có thể được kích hoạt bởi:

- domain event
- interceptor
- explicit application logic

### 11.5 Queue

Queue dùng cho việc không cần đồng bộ ngay.

Ví dụ điển hình:

- notification fan-out
- background processing
- tasks cần retry

### 11.6 Realtime

Realtime là đường phụ trợ để đẩy state đổi ra client nhanh hơn HTTP polling.

## 12. Data flow by concern

### 12.1 Write flow

Ví dụ chung cho command:

1. Controller nhận request.
2. DTO validate input.
3. Handler xử lý command.
4. Domain entity enforce rule.
5. Repository persist state.
6. Domain event được phát.
7. Cache/queue/realtime/audit phản ứng nếu cần.
8. Controller trả response.

### 12.2 Read flow

Ví dụ chung cho query:

1. Controller nhận query params.
2. Handler xử lý query.
3. Repository đọc data.
4. Presenter shape response.
5. Controller trả JSON.

Read flow thường đơn giản hơn write flow vì không có nhiều side effect.

### 12.3 Session flow

Auth/session flow thường:

1. Login tạo access token và refresh token.
2. Session info được lưu ở Redis.
3. Refresh endpoint kiểm tra session còn hợp lệ không.
4. Logout/revoke xóa session tương ứng.

### 12.4 Event flow

Khi domain phát event:

1. Aggregate root giữ event trong memory.
2. Dispatcher lấy event ra.
3. Listener xử lý event.
4. Listener có thể đẩy job, update cache, tạo notification, hoặc phát realtime.

## 13. Why the project is structured this way

Kiến trúc này có một tư duy rất rõ:

- domain là trung tâm
- application điều phối
- presentation là cửa vào
- infrastructure là công cụ
- cross-cutting concerns được tách ra khỏi use case

Điều đó giúp repo không bị biến thành “đống service gọi lẫn nhau”.

Nếu một tính năng mới được thêm vào, câu hỏi đúng không phải là:

- file nào tiện để nhét vào?

mà là:

- nó thuộc bounded context nào?
- nó là command hay query?
- nó là domain rule hay chỉ là adapter?
- nó có tạo side effect không?

## 14. File reading order

Nếu bạn mới vào codebase, nên đọc theo thứ tự:

1. [main.ts](/D:/Workspaces/Repo/turborepo-advanced-starter/apps/server/src/main.ts)
2. [app.module.ts](/D:/Workspaces/Repo/turborepo-advanced-starter/apps/server/src/app.module.ts)
3. [shared/domain/result.ts](/D:/Workspaces/Repo/turborepo-advanced-starter/apps/server/src/shared/domain/result.ts)
4. [shared/domain/aggregate-root.ts](/D:/Workspaces/Repo/turborepo-advanced-starter/apps/server/src/shared/domain/aggregate-root.ts)
5. [shared/application/events/domain-event-dispatcher.ts](/D:/Workspaces/Repo/turborepo-advanced-starter/apps/server/src/shared/application/events/domain-event-dispatcher.ts)
6. [shared/infrastructure/filters/domain-exception.filter.ts](/D:/Workspaces/Repo/turborepo-advanced-starter/apps/server/src/shared/infrastructure/filters/domain-exception.filter.ts)
7. [IAM / Auth README](/D:/Workspaces/Repo/turborepo-advanced-starter/apps/server/src/contexts/iam/auth/README.md)
8. [IAM / Users README](/D:/Workspaces/Repo/turborepo-advanced-starter/apps/server/src/contexts/iam/users/README.md)
9. [IAM / Roles README](/D:/Workspaces/Repo/turborepo-advanced-starter/apps/server/src/contexts/iam/roles/README.md)
10. [Audit README](/D:/Workspaces/Repo/turborepo-advanced-starter/apps/server/src/contexts/audit/README.md)

## 15. Practical notes

- `main.ts` vẫn còn TODO kỹ thuật, nên đây là backend đang tiến hóa chứ không phải hệ thống đã freeze.
- Một số context như `analytics`, `menu`, `notifications`, `storage` có thể mở rộng dần theo yêu cầu sản phẩm.
- Khi docs và code lệch nhau, ưu tiên code hiện tại rồi cập nhật docs.
- Nếu bạn muốn hiểu một feature cụ thể, thường cách nhanh nhất là đọc `presentation -> application -> domain -> infrastructure` theo đúng thứ tự đó.

## 16. Mental model

Chỉ cần giữ 5 câu này trong đầu:

- controller là cửa vào
- application là nơi chạy use case
- domain là nơi giữ luật
- infrastructure là nơi gắn công nghệ
- shared là bộ công cụ dùng chung

Nếu nhớ thêm một câu nữa:

> Một thay đổi nghiệp vụ nên bắt đầu từ domain/application, không phải từ database hay controller.
