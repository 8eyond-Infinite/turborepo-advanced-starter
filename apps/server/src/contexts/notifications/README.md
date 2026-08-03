# Notifications bounded context

> **Phần III · Chương 12 — Thông báo và trạng thái đã đọc**
>
> Chương trước: [Roles context](../iam/roles/README.md) · [Mục lục handbook](../../../../../docs/README.md) · Chương sau: [Audit context](../audit/README.md)

Notification là một bản ghi bền dành cho đúng một người nhận. Realtime chỉ là cách báo nhanh rằng dữ liệu mới đã có; nó không thay thế database. Nếu browser đang offline, user vẫn phải đọc được notification sau khi đăng nhập lại.

Hãy theo flow từ lúc một nghiệp vụ báo “có chuyện vừa xảy ra”. Bộ định tuyến quyết định có cần tạo notification hay không. Repository lưu notification vào PostgreSQL. Sau đó Socket.IO chỉ báo cho Admin rằng dữ liệu mới đã có; Admin đánh dấu cache cũ là hết hạn và gọi HTTP để đọc bản đầy đủ.

Thông báo “chuyện vừa xảy ra” được gọi là **domain event**. Việc đánh dấu cache cũ để tải lại gọi là **invalidate query**. WebSocket chỉ đánh thức giao diện, không trở thành một nguồn dữ liệu thứ hai.

## 1. Trách nhiệm

Notifications sở hữu vòng đời thông báo trong ứng dụng: tạo bản ghi bền vững, truy vấn hộp thư của một user, đánh dấu một hoặc toàn bộ thông báo đã đọc, và phát domain event để realtime delivery có thể diễn ra sau transaction.

Context này không sở hữu email delivery, authentication hay nội dung nghiệp vụ đã kích hoạt thông báo. Bounded context nguồn quyết định khi nào cần thông báo và gửi command phù hợp; Notifications quyết định cách lưu, đọc và chuyển trạng thái read.

## 2. Cấu trúc

```text
notifications/
├── domain/
│   ├── notification.entity.ts
│   ├── events/
│   └── ports/notification.repository.ts
├── application/
│   ├── commands/
│   │   ├── create-notification
│   │   └── mark-read
│   ├── queries/get-notifications
│   └── events/handlers
├── infrastructure/
│   ├── mappers/notification.mapper.ts
│   └── repositories/prisma-notification.repository.ts
└── presentation/controllers/notification.controller.ts
```

Domain entity bảo vệ state của một notification. Application handler điều phối use case qua repository port. Prisma adapter là nơi duy nhất biết schema database. Controller chỉ chuyển HTTP input thành command/query và unwrap `Result`.

## 3. Luồng tạo và realtime delivery

Khi `CreateNotificationHandler` lưu entity, repository ghi notification và outbox event trong cùng Prisma transaction. Chỉ sau commit, outbox publisher mới chuyển event sang event bus; realtime handler gửi `notification_received` tới room của user.

```text
source context
→ CreateNotificationCommand
→ NotificationEntity
→ Prisma transaction: notification + outbox event
→ outbox publisher
→ realtime gateway
→ Admin invalidates notification query
```

Transactional outbox bảo đảm không có trạng thái “database đã có notification nhưng event bị mất vì process crash giữa hai lệnh”. Realtime là tín hiệu làm mới nhanh, không phải nguồn dữ liệu gốc; client luôn refetch HTTP.

## 4. Query contract và unread count

`GET /notifications?page=&limit=` chỉ trả dữ liệu của principal hiện tại. Response gồm:

- `items`: page notification theo `createdAt desc`;
- `total`: tổng số notification của user;
- `unreadCount`: tổng số chưa đọc trên toàn bộ hộp thư;
- `page` và `limit`.

`unreadCount` phải được đếm ở repository với `where: { userId, isRead: false }`. Không được suy ra từ `items`, vì page đầu chỉ chứa tối đa `limit` bản ghi và sẽ làm badge báo thiếu khi hộp thư lớn.

## 5. Mark-read authorization

`PATCH /notifications/:id/read` tải notification theo ID rồi kiểm tra `notification.userId === principal.id` trước khi save. Không được update trực tiếp chỉ theo ID ở controller hoặc adapter, vì như vậy một user có thể đánh dấu notification của user khác.

Nếu ID không tồn tại, API trả lỗi domain `NOTIFICATION_NOT_FOUND` với HTTP 404. Nếu notification thuộc user khác, API trả `NOTIFICATION_FORBIDDEN` với HTTP 403; controller không biến hai lỗi này thành một `400` chung, vì client và audit cần phân biệt resource thiếu với vi phạm ownership.

`POST /notifications/read-all` luôn giới hạn `userId` hiện tại ở repository. Hai use case đều idempotent về kết quả cuối: gọi lại trên notification đã đọc vẫn cho trạng thái đã đọc.

## 6. Admin cập nhật cache như thế nào?

Admin tải page đầu tối đa 50 item cho popover nhưng dùng `unreadCount` từ server cho badge. Mark-read dùng optimistic cache update để phản hồi ngay, lưu snapshot trước mutation và rollback nếu request thất bại. Sau thành công, root key `notificationKeys.all` được invalidate để đối chiếu lại với server.

Payload `notification_received`, tên event và mã lỗi handshake realtime nằm trong `packages/contracts/src/realtime/events.ts`. Server outbox router và Admin event handler cùng import contract này; không tạo lại interface payload hoặc string event riêng trong từng ứng dụng.

Event realtime chỉ invalidate root key. Nó không tự chèn payload vào cache vì event không mang toàn bộ read model và có thể đến trùng hoặc sai thứ tự.

## 7. Những quy tắc luôn phải đúng

- Mọi query và mutation phải bị giới hạn bởi authenticated user.
- Badge unread lấy từ server trên toàn mailbox.
- Notification và outbox event được commit nguyên tử.
- Realtime không thay thế HTTP read model.
- Optimistic update phải có rollback.
- UI notification chưa đọc phải thao tác được bằng bàn phím.

## 8. Bản đồ code và câu hỏi tự kiểm tra

Khi bắt đầu điều tra notification, mở `notifications.module.ts` để thấy composition root của context. Từ endpoint HTTP, đi vào `presentation/controllers`; từ một event được phát, bắt đầu ở handler/router tạo notification. Repository adapter là nơi duy nhất nên biết Prisma, còn Admin integration nằm ở feature notification của `apps/admin`.

Trước khi sửa context, hãy tự giải thích được ba điều bằng lời của mình: vì sao realtime event chỉ invalidate cache, vì sao mark-read phải kiểm tra `userId`, và chuyện gì xảy ra nếu browser offline lúc notification được tạo. Nếu chưa trả lời được, đọc lại flow tạo và cache lifecycle trước khi code.
