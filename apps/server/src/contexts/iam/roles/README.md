# Tài liệu Kỹ thuật Chi tiết: Module Vai trò & Phân quyền (Roles Bounded Context)

Module này quản lý thực thể Vai trò (Role Aggregate), ánh xạ danh sách Quyền hạn (Permissions) tương ứng và cập nhật cấu trúc phân quyền hệ thống.

---

## 1. Nghiệp vụ & Quy tắc cốt lõi (Domain Rules)

* **Thực thể Role**: Mỗi vai trò đại diện bởi tên định danh duy nhất (`name`, ví dụ: `ADMIN`, `USER`), mô tả (`description`) và danh sách các quyền hạn (`permissions`).
* **Mối quan hệ Nhiều-Nhiều (Many-to-Many)**: User liên kết với Roles qua bảng trung gian `UserRole`. Roles liên kết với Permissions qua bảng trung gian `RolePermission`.
* **Phân quyền Stateless In-Memory**: Các API nhạy cảm được bảo vệ qua `@RequirePermissions(PERMISSIONS.ROLE.READ)` với `PermissionsGuard` kiểm tra trực tiếp từ JWT payload mà không query Database.
* **Xóa mềm (Soft Delete)**: Khi xóa Role, thuộc tính `isDeleted` cập nhật thành `true` thay vì xóa vật lý khỏi database để đảm bảo toàn vẹn dữ liệu lịch sử thao tác.

---

## 2. Danh sách Use Cases (CQRS)

### Nhánh Ghi - Lệnh (Commands)
1. **`CreateRoleCommand`**: Tạo vai trò mới trong hệ thống.
2. **`UpdateRolePermissionsCommand`**: Cập nhật/Đồng bộ lại danh sách quyền hạn gán cho vai trò cụ thể.
3. **`DeleteRoleCommand`**: Đánh dấu xóa vai trò.

### Nhánh Đọc - Truy vấn (Queries)
1. **`GetRolesQuery`**: Truy vấn danh sách toàn bộ các vai trò và quyền hạn tương ứng có trong hệ thống.
2. **`GetPermissionsQuery`**: Lấy danh sách tất cả các quyền hạn hệ thống hỗ trợ để hiển thị trên UI cấu hình.

---

## 3. Đặc tả API Endpoints

| Giao thức | Route | Bảo vệ bằng | Quyền yêu cầu (Constant) | DTO đầu vào | Trả về |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GET** | `/roles` | `JwtAuthGuard` & `PermissionsGuard` | `PERMISSIONS.ROLE.READ` (`role:read`) | Không | `Role[]` |
| **GET** | `/roles/permissions` | `JwtAuthGuard` & `PermissionsGuard` | `PERMISSIONS.ROLE.READ` (`role:read`) | Không | `Permission[]` |
| **POST** | `/roles` | `JwtAuthGuard` & `PermissionsGuard` | `PERMISSIONS.ROLE.CREATE` (`role:create`) | `{ name, description }` | `Role` |
| **PUT** | `/roles/:id/permissions`| `JwtAuthGuard` & `PermissionsGuard` | `PERMISSIONS.ROLE.UPDATE` (`role:update`) | `{ permissions: string[] }` | `Role` |
| **DELETE** | `/roles/:id` | `JwtAuthGuard` & `PermissionsGuard` | `PERMISSIONS.ROLE.DELETE` (`role:delete`) | Không | `{ success: true }` |

---

## 4. Chi tiết cấu trúc thư mục và Vai trò từng File

```
roles/
├── domain/                                      # LỚP NGHIỆP VỤ LÕI (DOMAIN LAYER)
│   ├── role.entity.ts                           # Thực thể Role nghiệp vụ
│   ├── ports/
│   │   └── role.repository.ts                   # Cổng giao tiếp DB (Interface)
│   └── exceptions/                              # Định nghĩa các ngoại lệ nghiệp vụ của Role
│       ├── role-not-found.exception.ts
│       └── role-already-exists.exception.ts
│
├── application/                                 # LỚP ỨNG DỤNG/ĐIỀU HƯỚNG (APPLICATION LAYER)
│   ├── commands/                                # Các hành động thay đổi trạng thái (Ghi)
│   │   ├── index.ts                             # Barrel export toàn bộ Commands
│   │   ├── create-role.command.ts               # Data object tạo Role mới
│   │   ├── delete-role.command.ts               # Data object xóa Role
│   │   ├── update-role-permissions.command.ts   # Data object cập nhật quyền cho Role
│   │   └── handlers/
│   │       ├── create-role.handler.ts           # Xử lý thêm mới Role và kiểm tra trùng tên
│   │       ├── delete-role.handler.ts           # Xử lý xóa mềm Role
│   │       └── update-role-permissions.handler.ts # Xử lý cập nhật danh sách quyền hạn cho Role
│   └── queries/                                 # Các hành động lấy dữ liệu (Đọc)
│       ├── index.ts                             # Barrel export toàn bộ Queries
│       ├── get-roles.query.ts                   # Data object truy vấn vai trò
│       ├── get-permissions.query.ts             # Data object truy vấn danh sách quyền có sẵn
│       └── handlers/
│           ├── get-roles.handler.ts             # Bộ xử lý trả về danh sách các vai trò
│           └── get-permissions.handler.ts       # Bộ xử lý trả về tất cả các quyền hệ thống hỗ trợ
│
├── infrastructure/                              # LỚP HẠ TẦNG (INFRASTRUCTURE LAYER)
│   ├── repositories/
│   │   └── prisma-role.repository.ts            # Triển khai lưu trữ PostgreSQL thông qua Prisma
│   └── mappers/
│       └── prisma-role.mapper.ts                # Chuyển đổi dữ liệu DB Model <=> Domain Role Entity
│
└── presentation/                                # LỚP GIAO TIẾP (PRESENTATION LAYER)
    └── controllers/
        └── roles.controller.ts                  # REST API Controller điều hướng với barrel imports gọn gàng
```

---

## 5. Sơ đồ tuần tự Cập nhật Quyền của Vai trò (Mermaid)

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant RolesController
    participant CommandBus
    participant UpdateRolePermissionsHandler
    participant RoleRepository
    participant PrismaRoleRepository
    participant Database

    Admin->>RolesController: PUT /roles/:id/permissions { permissions: ['user:read', 'user:create'] }
    activate RolesController
    RolesController->>CommandBus: execute(new UpdateRolePermissionsCommand(id, permissions))
    activate CommandBus
    CommandBus->>UpdateRolePermissionsHandler: execute(command)
    activate UpdateRolePermissionsHandler

    UpdateRolePermissionsHandler->>RoleRepository: findById(id)
    activate RoleRepository
    RoleRepository->>Database: Query role details
    Database-->>RoleRepository: raw role
    RoleRepository-->>UpdateRolePermissionsHandler: RoleEntity
    deactivate RoleRepository

    UpdateRolePermissionsHandler->>UpdateRolePermissionsHandler: Update permissions inside RoleEntity
    UpdateRolePermissionsHandler->>RoleRepository: save(roleEntity)
    activate RoleRepository
    RoleRepository->>PrismaRoleRepository: save(role)
    activate PrismaRoleRepository
    PrismaRoleRepository->>Database: Prisma Transaction (delete old permissions & insert new ones)
    Database-->>PrismaRoleRepository: Commit Transaction
    PrismaRoleRepository-->>RoleRepository: void
    deactivate PrismaRoleRepository
    RoleRepository-->>UpdateRolePermissionsHandler: void
    deactivate RoleRepository

    UpdateRolePermissionsHandler-->>CommandBus: Result.ok(roleEntity)
    deactivate UpdateRolePermissionsHandler
    CommandBus-->>RolesController: Result.ok
    deactivate CommandBus
    RolesController-->>Admin: Return updated Role JSON response
    deactivate RolesController
```

---

## 6. Chi tiết hoạt động đi qua các Tầng (Layer Transition)

Dưới đây là hành trình của luồng dữ liệu đi qua từng tệp tin từ ngoài vào trong:

### Tầng 1: Presentation (Đón nhận & Xác thực HTTP)

#### 1. `presentation/controllers/roles.controller.ts`
* **Nhiệm vụ**: Đón nhận các yêu cầu HTTP liên quan đến vai trò.
* **Hoạt động**:
  1. Hứng request HTTP.
  2. Sử dụng decorator `@RequirePermissions(PERMISSIONS.ROLE.UPDATE)` để chắc chắn chỉ Admin có quyền sửa mới được đi tiếp.
  3. Đóng gói dữ liệu đầu vào thành Command (`CreateRoleCommand`) hoặc Query (`GetRolesQuery`) rồi dispatch qua Bus.

---

### Tầng 2: Application (Thực thi Use Case)

#### 2. `application/commands/handlers/update-role-permissions.handler.ts`
* **Nhiệm vụ**: Điều phối luồng xử lý cập nhật quyền.
* **Hoạt động**:
  1. Nhận thông tin ID vai trò và mảng quyền hạn mới từ Command.
  2. Lấy thông tin thực thể `Role` hiện tại từ repository.
  3. Cập nhật mảng quyền vào đối tượng `RoleEntity`.
  4. Gọi `RoleRepository.save(role)` để lưu lại.

---

### Tầng 3: Domain (Nghiệp vụ Phân quyền)

#### 3. `domain/role.entity.ts`
* **Nhiệm vụ**: Định hình thực thể Vai trò.
* **Hoạt động**:
  1. Quản lý các thuộc tính `name`, `description`, và danh sách `permissions` của vai trò.
  2. Thực hiện kiểm tra tính hợp lệ nghiệp vụ (ví dụ: tên Role không được phép để rỗng).

#### 4. `domain/ports/role.repository.ts`
* **Nhiệm vụ**: Cổng giao tiếp DB (Interface).
* **Hoạt động**: Định nghĩa các phương thức trừu tượng: `save()`, `findById()`, `findByName()`, `delete()`.

---

### Tầng 4: Infrastructure (Truy cập DB)

#### 5. `infrastructure/repositories/prisma-role.repository.ts`
* **Nhiệm vụ**: Cài đặt truy vấn PostgreSQL thực tế thông qua Prisma Client.
* **Hoạt động**:
  1. Thực hiện các câu lệnh Prisma truy cập vào bảng `Role`.
  2. Đối với phương thức `save()`, Prisma sẽ khởi tạo một **Transaction** để xóa sạch các liên kết cũ trong bảng `RolePermission` và chèn mới các liên kết quyền hạn mới gán một cách an toàn và đồng bộ.
  3. Sử dụng Mapper để ánh xạ dữ liệu DB sang Domain Entity.
