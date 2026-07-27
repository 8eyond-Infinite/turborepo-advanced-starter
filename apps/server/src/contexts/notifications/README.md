# Notifications bounded context

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

`POST /notifications/read-all` luôn giới hạn `userId` hiện tại ở repository. Hai use case đều idempotent về kết quả cuối: gọi lại trên notification đã đọc vẫn cho trạng thái đã đọc.

## 6. Admin cache lifecycle

Admin tải page đầu tối đa 50 item cho popover nhưng dùng `unreadCount` từ server cho badge. Mark-read dùng optimistic cache update để phản hồi ngay, lưu snapshot trước mutation và rollback nếu request thất bại. Sau thành công, root key `notificationKeys.all` được invalidate để đối chiếu lại với server.

Event realtime chỉ invalidate root key. Nó không tự chèn payload vào cache vì event không mang toàn bộ read model và có thể đến trùng hoặc sai thứ tự.

## 7. Invariants

- Mọi query và mutation phải bị giới hạn bởi authenticated user.
- Badge unread lấy từ server trên toàn mailbox.
- Notification và outbox event được commit nguyên tử.
- Realtime không thay thế HTTP read model.
- Optimistic update phải có rollback.
- UI notification chưa đọc phải thao tác được bằng bàn phím.
