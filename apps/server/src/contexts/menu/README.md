# Menu: navigation theo quyền của người đang đăng nhập

Menu tạo cây điều hướng mà một user được phép nhìn thấy. Nó không quyết định user có được gọi API hay không; backend guard vẫn là lớp authorization bắt buộc. Ẩn menu chỉ giúp giao diện đúng với capability của user, không phải biện pháp bảo mật.

## Đi theo flow

Admin gọi `GET /menus`. `MenuController` yêu cầu access token và lấy danh sách permission từ authenticated principal. `GetMenusQueryHandler` đọc các menu đã sắp thứ tự qua `MenuReader`, loại node yêu cầu permission mà user không có, ghép root với child, rồi bỏ group rỗng chỉ dùng làm tiêu đề.

```text
GET /menus
  → JwtAuthGuard
  → permissions từ principal
  → GetMenusQueryHandler
  → MenuReader → Prisma → menu table
  → permission filter
  → navigation tree
```

Menu hiện hỗ trợ hai tầng root/child. Một node không có `permission` được xem là public đối với user đã đăng nhập. Node có URL `#` và không còn child hợp lệ sẽ bị loại để giao diện không hiển thị group rỗng.

## Vì sao không có domain layer đầy đủ?

Capability này chỉ tạo read projection từ dữ liệu cấu hình và permission có sẵn. Nó chưa sở hữu business invariant hoặc vòng đời aggregate riêng. Tạo entity/repository ghi giả chỉ để đủ bốn layer sẽ làm code khó hiểu hơn. Application vẫn phụ thuộc vào `MenuReader` để không import Prisma trực tiếp.

## Bản đồ file

```text
menu/
├── application/
│   ├── ports/menu-reader.port.ts
│   └── queries/
├── infrastructure/prisma-menu.reader.ts
├── presentation/controllers/menu.controller.ts
└── menu.module.ts
```

## Khi thêm menu

Menu seed phải dùng permission identifier có trong `@repo/contracts`. Route frontend và backend permission guard phải tồn tại độc lập; đừng coi việc thêm row vào bảng menu là đã cấp quyền. Nếu cần cây sâu hơn hai tầng, thay projection algorithm và thêm test cho orphan, cycle và ordering trước khi đổi response.

## Failure modes

Permission sai chính tả làm menu biến mất nhưng không tự tạo quyền mới. Parent bị lọc có thể làm child không được gắn vào tree. Database lỗi phải trả lỗi thay vì navigation rỗng, vì navigation rỗng có thể bị hiểu nhầm là user không có quyền.

## Tự kiểm tra

Bạn phải phân biệt được “menu visibility” với “API authorization”, chỉ ra nơi permission được lấy và nơi Prisma được phép xuất hiện.
