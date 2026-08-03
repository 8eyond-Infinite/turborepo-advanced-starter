# Dashboard: số liệu tổng quan cho quản trị viên

Dashboard trả lời một câu hỏi đơn giản: “Hệ thống hiện có bao nhiêu user, session và role, và user mới tăng như thế nào trong bảy ngày gần đây?”. Đây là capability đọc dữ liệu để quan sát, không sở hữu vòng đời của User hay Role. Vì vậy nó nằm dưới `analytics` và không tạo domain entity hoặc repository ghi dữ liệu riêng.

## Đi theo flow

Admin gọi `GET /dashboard/stats` với access token. `DashboardController` chạy `JwtAuthGuard`, yêu cầu permission `user:read`, rồi gửi `GetDashboardStatsQuery` vào QueryBus. Handler lấy số user, phân bố role và xu hướng đăng ký qua `DashboardStatsReader`; số active session được đọc qua shared cache port. Hai nguồn được ghép thành một read model và trả về Admin.

```text
GET /dashboard/stats
  → authentication + permission guard
  → GetDashboardStatsQueryHandler
      ├─ DashboardStatsReader → Prisma → PostgreSQL
      └─ CachePort → Redis session keys
  → DashboardStats JSON
```

Handler không import Prisma. `dashboard-stats-reader.port.ts` là hợp đồng đọc mà application cần; `prisma-dashboard-stats.reader.ts` là adapter biết schema database và cách aggregate. Ranh giới này cho phép đổi truy vấn, dùng materialized view hoặc analytics store mà không kéo persistence detail vào use case.

## Dữ liệu trả về

Response gồm tổng số user chưa bị xóa, số active/inactive user, số active session, phân bố user theo role và số user đăng ký theo từng ngày trong bảy ngày gần nhất. Đây là số liệu operational gần thời gian thực, không phải báo cáo tài chính hoặc kho dữ liệu lịch sử.

## Bản đồ file

```text
dashboard/
├── application/
│   ├── ports/dashboard-stats-reader.port.ts
│   └── queries/
├── infrastructure/prisma-dashboard-stats.reader.ts
├── presentation/controllers/dashboard.controller.ts
└── dashboard.module.ts
```

## Khi mở rộng

Nếu thêm một card lấy từ cùng PostgreSQL, mở rộng read port và Prisma reader. Nếu số liệu tốn nhiều thời gian hoặc cần lịch sử dài, tạo projection/materialized view hoặc context analytics riêng; đừng đưa truy vấn nặng vào controller. Mỗi metric mới cần định nghĩa rõ nguồn dữ liệu, timezone, cửa sổ thời gian và ý nghĩa khi dữ liệu bị trễ.

## Failure modes

PostgreSQL lỗi làm toàn query thất bại và được chuyển thành domain-safe internal error. Redis lỗi cũng khiến số active session không đáng tin nên hiện tại query thất bại thay vì trả số 0 giả. Với hệ thống cần dashboard chịu lỗi từng phần, response contract phải biểu diễn metric nào unavailable thay vì âm thầm thay bằng 0.

## Tự kiểm tra

Sau khi đọc, bạn phải giải thích được vì sao Dashboard không có aggregate, vì sao handler không được import Prisma, và metric active session khác active user như thế nào.
