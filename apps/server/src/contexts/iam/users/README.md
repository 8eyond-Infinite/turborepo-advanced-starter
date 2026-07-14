# Module Người dùng (Users Bounded Context)

Module này quản lý thông tin thực thể Người dùng (User Aggregate), phân quyền truy cập và các thao tác liên quan tới cập nhật trạng thái tài khoản.

---

## 1. Nghiệp vụ & Quy tắc cốt lõi (Domain Rules)
*   **Giá trị bất biến (Value Objects)**:
    *   `UserId`: Định dạng định danh duy nhất UUID.
    *   `Email`: Đảm bảo định dạng chuẩn email và không trống.
    *   `Password`: Bảo vệ an toàn dữ liệu mật khẩu thô và mật khẩu đã băm.
*   **Trạng thái kích hoạt**: Tài khoản có thể chuyển đổi qua lại giữa hoạt động (`isActive: true`) và khóa/ngưng hoạt động (`isActive: false`).
*   **Phân quyền dựa trên vai trò (RBAC)**: Tích hợp bảo vệ các tài nguyên HTTP nhạy cảm dựa trên danh sách quyền hạn lấy từ database (`userPermissions`) thông qua `PermissionsGuard`.

---

## 2. Đặc tả API Endpoints

| Giao thức | Route | Bảo vệ bằng | Quyền yêu cầu | Trả về | Cache (Redis) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GET** | `/users/me` | `JwtAuthGuard` | Không | `UserResponse` | Có (60 giây) |
| **GET** | `/users` | `JwtAuthGuard` & `PermissionsGuard` | `user:read` | `UserResponse[]` | Có (120 giây) |
| **PATCH**| `/users/:id/deactivate` | `JwtAuthGuard` & `PermissionsGuard` | `user:update` | `{ success: true }` | Không |

---

## 3. Danh sách Use Cases (CQRS)

### Lệnh (Commands)
1.  **`DeactivateUserCommand`**: Khóa tài khoản của người dùng. Cập nhật `isActive: false` xuống DB và phát sự kiện miền `UserDeactivatedEvent`.

### Truy vấn (Queries)
1.  **`GetUsersQuery`**: Lấy danh sách toàn bộ người dùng đang hoạt động trong hệ thống.
2.  **`GetUserByIdQuery`**: Lấy chi tiết thông tin người dùng dựa trên ID.

---

## 4. Sự kiện miền (Domain Events) & Lắng nghe (Listeners)
*   **`UserDeactivatedEvent`**: Phát đi khi tài khoản bị khóa.
    *   *Listener*: `UserDeactivatedEventHandler` lắng nghe sự kiện này và ngay lập tức gọi Redis thu hồi toàn bộ token hoạt động của user bị khóa để cưỡng chế đăng xuất tức thì trên mọi thiết bị.
*   **`UserRegisteredEvent`** (Lắng nghe từ Auth Module):
    *   *Listener*: `UserRegisteredEventHandler` bắt sự kiện và đẩy job `send-welcome-email` vào BullMQ queue để thực thi ngầm tác vụ gửi email chào mừng.

---

## 5. Tự động dọn dẹp bộ nhớ đệm (Cache Invalidation)
API khóa tài khoản (`PATCH /users/:id/deactivate`) được trang trí với interceptor hủy cache:
```typescript
@UseInterceptors(CacheInvalidationInterceptor)
@InvalidateCache('users:all', 'users:me:{id}')
```
Khi lệnh thực thi thành công, hệ thống tự động xóa bộ nhớ đệm danh sách (`users:all`) và bộ nhớ đệm trang cá nhân của chính user bị khóa (`users:me:${userId}`).
