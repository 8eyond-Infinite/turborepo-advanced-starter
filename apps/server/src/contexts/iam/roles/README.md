# Roles Bounded Context

> **Phần III · Chương 11 — Vai trò, quyền và quyết định truy cập**
>
> Chương trước: [Users context](../users/README.md) · [Mục lục handbook](../../../../../../docs/README.md) · Chương sau: [Notifications context](../../notifications/README.md)

Roles trả lời “một danh tính đã biết có được thực hiện hành động này không?”. Chương này tách rõ authentication (401: chưa chứng minh được danh tính) và authorization (403: biết người gọi nhưng họ thiếu quyền).

Ta sẽ đi theo request đọc danh sách role. Guard xác thực token trước, permission guard đọc metadata của endpoint, backend tải quyền hiệu lực của user rồi mới cho controller chạy. UI có thể ẩn nút để trải nghiệm tốt hơn, nhưng quyết định bảo mật cuối cùng luôn nằm ở backend.

Roles sở hữu mô hình RBAC: role, danh mục permission và quan hệ role-permission. Context này trả lời “một role đại diện cho tập quyền nào?”. Còn việc kiểm tra một HTTP request có đủ quyền hay không diễn ra ở guard thuộc tầng presentation.

> Gặp từ lạ (RBAC, guard, aggregate, tokenVersion…)? Tra [Bảng thuật ngữ](../../../../../../docs/glossary.md).

## 1. Khái niệm nghiệp vụ

Permission là một quyền nhỏ, ổn định, dùng chung qua `@repo/contracts` — ví dụ quyền đọc user hoặc quyền cập nhật user. Role là một nhóm permission có tên và mô tả. User nhận permission bằng cách được gán role.

Luồng khái niệm:

```text
User ──has──> Role ──contains──> Permission
                         │
JWT access token <──── resolved permissions
```

Frontend và backend dùng chung một bộ tên permission để hai bên không lệch nhau. Tuy nhiên chặn hay cho qua một request luôn do backend quyết định cuối cùng.

## 2. Ranh giới và ownership

Roles sở hữu:

- Role aggregate;
- port repository của role;
- các use case tạo role, xóa role và cập nhật tập permission của role;
- query đọc danh sách role và danh mục permission;
- phần ánh xạ Prisma cho các bảng Role/Permission/RolePermission.

Roles không sở hữu việc gán/bỏ role cho user (bảng UserRole) — phần đó thuộc User aggregate. Khi admin đổi role của một user, Users context xử lý và tăng tokenVersion.

## 3. Cấu trúc code

```text
roles/
├── domain/
│   ├── role.entity.ts
│   ├── exceptions/
│   └── ports/role.repository.ts
├── application/
│   ├── commands/ + handlers/
│   └── queries/ + handlers/
├── infrastructure/
│   └── repositories/prisma-role.repository.ts
├── presentation/
│   ├── controllers/roles.controller.ts
│   └── dtos/
└── roles.module.ts
```

## 4. Authorization request flow

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant JWT as JwtAuthGuard/JwtStrategy
    participant Guard as PermissionsGuard
    participant Meta as @RequirePermissions
    participant Controller

    Client->>JWT: Request + access token
    JWT->>JWT: Verify signature, User state, tokenVersion
    JWT-->>Guard: AuthenticatedPrincipal
    Guard->>Meta: Read required permissions
    Guard->>Guard: hasAllPermissions()
    alt đủ quyền
        Guard->>Controller: Allow
    else thiếu quyền
        Guard-->>Client: 403 Forbidden
    end
```

Bước kiểm tra permission chỉ đọc danh sách quyền ghi sẵn trong token — tin được, vì strategy vừa xác nhận ngay trước đó rằng token vẫn thuộc phiên bản quyền hiện tại của user. Vì đổi role của user làm tokenVersion tăng, token còn mang permission cũ sẽ bị loại từ bước xác thực.

Không xác định được người gọi là ai thì trả 401; biết là ai nhưng thiếu quyền thì trả 403. Hai trường hợp không được trộn lẫn.

### Thử bằng tay: phân biệt 401 và 403

```bash
# Không có token → 401: "bạn là ai tôi còn chưa biết"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/roles
# → 401

# Token hợp lệ nhưng user KHÔNG có ROLE.READ → 403: "biết bạn là ai, nhưng không được phép"
# (đăng nhập bằng một user thường chỉ có role USER)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/roles \
  -H "Authorization: Bearer <token của user thường>"
# → 403

# Token admin → 200 kèm danh sách role và permission
curl -s http://localhost:3001/roles -H "Authorization: Bearer <admin token>"
```

> **Tóm lại:**
>
> - Hai cổng nối tiếp: JwtAuthGuard trả lời "bạn là ai?" (sai → 401), PermissionsGuard trả lời "bạn được làm gì?" (thiếu → 403).
> - Permission check đọc claim trong token — tin được vì JwtStrategy đã đối chiếu `tokenVersion` với DB ngay trước đó.
> - Đổi role assignment của user ⇒ tokenVersion tăng ⇒ token cũ mang permission cũ bị loại ngay.

## 5. Create role flow

1. DTO validate name/description.
2. `PermissionsGuard` yêu cầu `ROLE.CREATE`.
3. Controller dựng `CreateRoleCommand`.
4. Handler kiểm tra role name đã tồn tại.
5. Handler tạo `RoleEntity`.
6. Repository lưu role và mapping cần thiết.
7. Audit interceptor ghi actor/action sau thành công.

Tạo role trùng tên phải trả về domain error có mã lỗi rõ ràng, không để lỗi unique constraint của Prisma văng thẳng ra HTTP.

## 6. Update permissions flow

`PUT /roles/:id/permissions` nhận một mảng string. Handler tải aggregate, gán tập quyền mới cho nó, rồi repository cập nhật bảng nối RolePermission cho khớp.

Mảng permission gửi lên được hiểu là trạng thái đích (“role này từ giờ có đúng những quyền này”), không phải danh sách thêm/bớt từng phần. Repository chỉ lấy những permission thực sự tồn tại trong database; tên không tồn tại hiện bị lặng lẽ bỏ qua. Đây là hành vi hiện tại, chưa lý tưởng, vì client gõ sai tên permission sẽ không nhận được lỗi nào.

Hướng sửa tiếp theo: kiểm tra toàn bộ danh sách tên trước khi thay bảng nối, và trả domain error nếu có tên không tồn tại. Chừng nào chưa làm phần đó, tài liệu và API không được tuyên bố rằng input đã được kiểm tra chặt.

Khi nội dung một role thay đổi, các access token đã cấp có thể vẫn mang danh sách permission cũ, cho tới khi tokenVersion của từng user liên quan tăng. Hiện tại tokenVersion chỉ tăng khi role của chính user đó bị gán lại, chứ không tự lan ra mọi user đang mang role vừa sửa. Nếu sản phẩm yêu cầu thu hồi token ngay cho tất cả user thuộc role đó, cần viết thêm một use case/outbox flow rõ ràng; đừng ngầm coi như tính năng này đã có.

> **Tóm lại (hai giới hạn thật cần nhớ):**
>
> - Gửi permission string sai chính tả hiện bị **âm thầm bỏ qua**, không báo lỗi — đừng tin rằng "gọi API thành công nghĩa là mọi permission đã được gán".
> - Sửa NỘI DUNG một role **không** tự thu hồi token của những user đang mang role đó; chỉ sửa ASSIGNMENT của từng user mới bump tokenVersion.

## 7. Delete semantics

Xóa role đi qua command/repository như một thao tác nghiệp vụ và chỉ đánh dấu xóa mềm (soft-delete), không xóa hẳn khỏi database. `ADMIN` và `USER` là hai system role được khai báo tập trung trong `@repo/contracts`; delete handler từ chối chúng bằng `SYSTEM_ROLE_DELETE_FORBIDDEN`. UI ẩn nút xóa để có trải nghiệm đúng, nhưng invariant thực sự nằm ở backend nên gọi thẳng API cũng không thể vượt qua.

Các chính sách còn cần quyết định rõ:

- role đang gắn cho user có được xóa không;
- user mất role sẽ được thay bằng role nào;
- token của các user liên quan bị thu hồi bằng cách nào.

Các chính sách này phải nằm trong tầng domain/application, không chôn trong Prisma adapter.

## 8. API surface

| Endpoint                     | Permission    | Mục đích              |
| ---------------------------- | ------------- | --------------------- |
| `GET /roles`                 | `ROLE.READ`   | Roles kèm permissions |
| `GET /roles/permissions`     | `ROLE.READ`   | Permission catalog    |
| `POST /roles`                | `ROLE.CREATE` | Tạo role              |
| `PUT /roles/:id/permissions` | `ROLE.UPDATE` | Thay tập permission   |
| `DELETE /roles/:id`          | `ROLE.DELETE` | Xóa role              |

## 9. Ý nghĩa từng nhóm file

`role.entity.ts` giữ dữ liệu và hành vi của role. Thư mục exceptions đặt tên cho từng kiểu thất bại (“role trùng tên”, “role không tồn tại”) dưới dạng domain error. `role.repository.ts` là interface lưu/đọc role, đồng thời là token để NestJS biết tiêm implementation nào vào.

Các file command/query mô tả use case; handler làm việc thật: tải entity qua repository, gọi hành vi của entity, lưu kết quả. `prisma-role.repository.ts` dịch qua lại giữa aggregate và ba bảng Role, Permission, RolePermission.

DTO kiểm tra input lúc chạy; controller chỉ nhận request, gắn guard/audit, gửi command/query vào bus rồi trả response.

## 10. Shared permission contracts

Các hằng số permission và hàm hỗ trợ như `hasAllPermissions` nằm trong `@repo/contracts`, vì nhiều ứng dụng (server, web) cần nói cùng một ngôn ngữ về quyền.

Khi thêm permission:

1. khai báo tên permission trong contracts;
2. cập nhật dữ liệu seed và danh mục trong database;
3. gắn permission vào role phù hợp;
4. dùng hằng số trong decorator, không viết chuỗi tay;
5. cập nhật admin UI nếu cần;
6. test cả trường hợp được phép lẫn bị từ chối.

## 11. Invariant và policy

- Tên role không được trùng; quy tắc này do domain/repository giữ.
- Chỉ permission có trong danh mục mới được lưu; tên lạ hiện bị bỏ qua trong im lặng — đây là điểm cần siết lại.
- Controller không được tự sửa bảng nối RolePermission.
- Không viết chuỗi tên role/permission rải rác trong code; luôn dùng hằng số từ contracts.
- Backend không tin việc UI đã ẩn nút; guard luôn chặn ở phía server.
- Thay đổi nào ảnh hưởng token của user phải nói rõ token bị thu hồi khi nào, bằng cách nào.

## 12. Anti-pattern

- Kiểm tra quyền bằng tên role (“nếu là ADMIN thì cho qua”) thay vì bằng permission.
- Tự query bảng permission trong từng controller.
- Chấp nhận chuỗi permission tùy ý rồi âm thầm bỏ qua giá trị sai.
- Sửa bảng nối RolePermission ở nơi khác ngoài repository.
- Xóa role hệ thống mà không có quy tắc chặn.
- Cho rằng sửa nội dung Role tự động thu hồi token trong khi tính năng đó chưa tồn tại.

## 13. Checklist review Roles

- Permission mới đã được khai báo trong contracts và seed chưa?
- Endpoint có dùng đúng hằng số permission không?
- Lỗi 401 và 403 có được trả đúng trường hợp không?
- Thay đổi role có kèm chính sách xử lý user/token liên quan không?
- Repository có cập nhật bảng nối đúng theo trạng thái đích không?
- Có test các ca cho phép, từ chối, trùng tên và role không tồn tại không?
