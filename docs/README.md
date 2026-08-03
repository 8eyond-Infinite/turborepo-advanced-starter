# Handbook của Turborepo Advanced Starter

Đây là trang bắt đầu của toàn bộ tài liệu dự án. Hãy hình dung bộ tài liệu như một cuốn sách: mỗi chương chuẩn bị kiến thức cho chương sau, còn các handbook nằm cạnh code là phần bạn mở lại khi đang sửa một bounded context cụ thể.

Nếu đây là lần đầu bạn vào repository, đừng đọc ngẫu nhiên từng README. Hãy bắt đầu từ Phần I và đi theo thứ tự. Nếu hệ thống đang có sự cố, bỏ qua lộ trình học và mở thẳng [Sổ tay vận hành](operations-runbook.md).

Handbook được viết cho lập trình viên đã biết TypeScript ở mức cơ bản nhưng chưa biết dự án, NestJS, DDD hay cách triển khai hệ thống. Bạn không cần thuộc thuật ngữ kiến trúc trước khi đọc. Khi một khái niệm mới xuất hiện, chương phải giải thích vấn đề đời thường trước, sau đó mới gọi tên kỹ thuật và chỉ vào code thật. Đây không phải tài liệu dành cho người dùng cuối của sản phẩm.

## Câu chuyện xuyên suốt

Trong các chương, ta dùng một tình huống chung để nối kiến trúc với code:

> Một quản trị viên đăng nhập, tạo tài khoản cho nhân viên mới và nhìn thấy người đó xuất hiện trong danh sách. Phía sau màn hình, server lưu tài khoản, ghi lại ai vừa thực hiện thao tác và giao việc gửi email chào mừng cho tiến trình chạy nền.

Đây là câu chuyện đời thường trước. Trong các chương sau, từng đoạn của câu chuyện mới được gắn với tên kỹ thuật tương ứng: xác thực, phân quyền, transaction, outbox, queue và worker. Khi hiểu được đường đi từ cú click đến dữ liệu rồi quay lại màn hình, bạn có thể dùng cùng cách suy luận cho nghiệp vụ khác.

## Phần I — Làm quen với dự án

Phần này trả lời: dự án gồm những gì, chạy bằng cách nào, nên đọc code theo thứ tự nào và những thuật ngữ trong repo có nghĩa gì.

1. [Chương 1 — Repository nhìn từ bên ngoài](../README.md)
   Bức tranh ngắn nhất về sản phẩm, các application, package dùng chung và quick start.
2. [Chương 2 — Lộ trình học bằng cách chạy hệ thống](getting-started-path.md)
   Chạy dự án, gọi API thật và quan sát một read flow, write flow, session và frontend cache.
3. [Chương 3 — Ngôn ngữ chung của dự án](glossary.md)
   Tra thuật ngữ khi gặp từ lạ; không cần học thuộc trước.
4. [Chương 4 — Công cụ và thư viện](tech-stack.md)
   Mỗi dependency giải quyết vấn đề nào và thuộc về lớp nào.

Kết thúc Phần I, bạn phải trả lời được: application nào nhận request, dữ liệu nằm ở đâu, Redis dùng cho việc gì và chạy quality gate bằng lệnh nào.

## Phần II — Kiến trúc và đường đi của code

Phần này đi từ toàn hệ thống vào từng application. Đọc nó khi bạn cần hiểu “vì sao code được chia như vậy”, không chỉ “file nằm ở đâu”.

5. [Chương 5 — Kiến trúc hệ thống](architecture.md)
   System context, monorepo boundary, dependency direction, CQRS, outbox và runtime topology.
6. [Chương 6 — Backend Architecture Handbook](../apps/server/README.md)
   Cách backend chia khu nghiệp vụ, đường đi của request đọc/ghi và nơi các module được lắp ráp.
7. [Chương 7 — Admin Portal Handbook](../apps/admin/README.md)
   Startup, routing, authentication, query cache, permission, realtime và cách thêm feature.
8. [Chương 8 — Client Web Handbook](../apps/client/README.md)
   Next.js BFF, server/client boundary, session cookie và SEO.

Kết thúc Phần II, bạn phải lần được một request từ UI đến database và quay trở lại mà không đoán.

## Phần III — Nghiệp vụ theo bounded context

Mỗi chương ở phần này sở hữu một nhóm quy tắc nghiệp vụ. Hãy đọc chương tương ứng trước khi sửa code trong context đó.

9. [Chương 9 — Auth: danh tính và vòng đời phiên](../apps/server/src/contexts/iam/auth/README.md)
10. [Chương 10 — Users: vòng đời tài khoản](../apps/server/src/contexts/iam/users/README.md)
11. [Chương 11 — Roles: vai trò và quyền](../apps/server/src/contexts/iam/roles/README.md)
12. [Chương 12 — Notifications: thông báo và realtime](../apps/server/src/contexts/notifications/README.md)
13. [Chương 13 — Audit: dấu vết hành động](../apps/server/src/contexts/audit/README.md)

Ba capability nhỏ cũng có handbook đặt cạnh code. Chúng không được đánh số thành chương nghiệp vụ độc lập vì không sở hữu aggregate lớn, nhưng phải đọc trước khi sửa capability tương ứng:

- [Dashboard: số liệu tổng quan](../apps/server/src/contexts/analytics/dashboard/README.md)
- [Menu: navigation theo quyền](../apps/server/src/contexts/menu/README.md)
- [Storage: local và S3-compatible adapters](../apps/server/src/contexts/storage/README.md)

Mỗi chương bắt đầu bằng một câu chuyện nghiệp vụ, chỉ ra phần nào chịu trách nhiệm, lần theo đường đi thành công rồi giải thích những chỗ có thể lỗi. Sau đó chương mới đi vào transaction, quy tắc bắt buộc, bản đồ file và cách mở rộng.

## Phần IV — Xây dựng, phát hành và vận hành

Phần này trả lời cách đưa code từ máy lập trình viên đến một môi trường đang phục vụ người dùng.

14. [Chương 14 — Development, Docker và database](development-and-deployment.md)
15. [Chương 15 — Deployment không phụ thuộc nhà cung cấp](provider-neutral-deployment.md)
16. [Chương 16 — Kiểm tra khả năng triển khai](deployment-readiness.md)
17. [Chương 17 — Release và version](release-process.md)
18. [Chương 18 — Operations Runbook](operations-runbook.md)

Không đọc runbook như giáo trình nhập môn. Nó được thiết kế để tra nhanh khi hệ thống lỗi. Muốn hiểu lý do đằng sau các lệnh vận hành, hãy đọc Chương 14–17 trước.

## Tra flow nghiệp vụ theo công việc

Không phải lúc nào bạn cũng cần đọc cả cuốn. Bảng này đưa bạn tới chương giải thích trọn flow, thay vì chỉ tới file có tên gần giống vấn đề.

| Khi cần hiểu hoặc sửa                                      | Đọc flow chính ở đâu?                                                                                                         | Đọc thêm khi chạm giao diện hoặc hạ tầng                                 |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Login, refresh, logout, reset password, xác minh email     | [Auth](../apps/server/src/contexts/iam/auth/README.md)                                                                        | [Admin](../apps/admin/README.md) hoặc [Client](../apps/client/README.md) |
| Tạo, sửa, khóa tài khoản và gán role                       | [Users](../apps/server/src/contexts/iam/users/README.md)                                                                      | [Roles](../apps/server/src/contexts/iam/roles/README.md)                 |
| Kiểm tra role/permission và phân biệt lỗi 401 với 403      | [Roles](../apps/server/src/contexts/iam/roles/README.md)                                                                      | [Kiến trúc hệ thống](architecture.md)                                    |
| Tạo notification, outbox, realtime và cập nhật cache       | [Notifications](../apps/server/src/contexts/notifications/README.md)                                                          | [Admin](../apps/admin/README.md)                                         |
| Truy ra ai đã thực hiện một thao tác quản trị              | [Audit](../apps/server/src/contexts/audit/README.md)                                                                          | [Operations Runbook](operations-runbook.md)                              |
| Chạy local, migration, Docker hoặc kiểm soát dung lượng    | [Development, Docker và database](development-and-deployment.md)                                                              | [Deployment contract](provider-neutral-deployment.md)                    |
| Deploy, rollback, backup/restore hoặc xử lý production lỗi | [Deployment readiness](deployment-readiness.md), [Release](release-process.md) và [Operations Runbook](operations-runbook.md) | Adapter của provider đang dùng                                           |

Nếu flow cần sửa không có trong bảng và cũng không thuộc rõ một bounded context, đừng tạo ngay một thư mục `shared`. Trước tiên xác định phần nào sở hữu quy tắc nghiệp vụ; [Chương 5](architecture.md) và [Backend Handbook](../apps/server/README.md) giải thích cách quyết định ranh giới đó.

## Phụ lục

- [Đóng góp vào repository](../CONTRIBUTING.md): branch, commit, PR và quality gate.
- [Chính sách bảo mật](../SECURITY.md): cách báo cáo lỗ hổng và phạm vi hỗ trợ.

## Ba cách sử dụng handbook

### Tôi là thành viên mới

Đọc Chương 1 → 8 theo thứ tự, vừa đọc vừa chạy bài tập ở Chương 2. Sau đó chọn bounded context đầu tiên mình sẽ sửa ở Phần III.

### Tôi sắp thêm một feature

Đọc Chương 5 để xác nhận dependency direction, handbook của application liên quan, rồi chương bounded context sở hữu nghiệp vụ. Cuối cùng dùng checklist “cách thêm use case” trong handbook đó.

### Production đang lỗi

Mở Chương 18, bắt đầu ở “Ba phút đầu tiên”, thu thập bằng chứng trước khi restart. Sau khi dịch vụ phục hồi mới quay lại các chương kiến trúc để phân tích nguyên nhân.

## Các nhãn dùng trong sách

Một số chương dài dùng các nhãn sau để người đọc biết mình đang làm gì:

- **Cách hình dung** giải thích khái niệm trừu tượng bằng một ví dụ dễ nhớ.
- **Đi theo flow** lần từng bước qua code thật.
- **Tự kiểm tra** là câu hỏi giúp bạn biết mình đã hiểu đủ để sang phần sau chưa.
- **Đọc code** là đường dẫn cụ thể để IDE mở đúng điểm bắt đầu.

Sơ đồ dùng để thể hiện quan hệ hoặc thứ tự. Table dùng để so sánh/tra cứu. Phần giải thích chính được viết bằng văn xuôi để người đọc hiểu được lý do, thay vì phải tự nối các bullet rời rạc.
