# Quy chuẩn viết tài liệu của repository

Tài liệu này dành cho người viết và reviewer. Người mới học dự án nên bắt đầu ở [Handbook](README.md), không cần đọc quy chuẩn này trước.

## Mục tiêu

Một chương tốt phải giúp người chưa biết hệ thống xây được mental model, tìm đúng code và tự kiểm tra hiểu biết. Nó không chỉ liệt kê thư mục hoặc lặp lại tên class.

## Khung của một chương

Tùy độ dài, chương nên trả lời theo thứ tự:

1. Chương này giúp người đọc làm được gì?
2. Cần đọc/chạy gì trước?
3. Vấn đề hoặc câu chuyện nghiệp vụ là gì?
4. Mental model đơn giản nhất là gì?
5. Flow đi qua những bước và file nào?
6. Vì sao boundary/decision hiện tại tồn tại?
7. Failure path và invariant quan trọng là gì?
8. Người đọc tự kiểm tra bằng cách nào?
9. Chương tiếp theo là gì?

Không bắt buộc biến chín câu hỏi thành chín heading cứng nhắc. Mục tiêu là giữ mạch kể tự nhiên.

## Văn phong

Viết cho một lập trình viên biết TypeScript nhưng chưa biết repository. Giải thích thuật ngữ ở lần xuất hiện đầu tiên hoặc link tới glossary. Dùng câu chủ động và chủ thể rõ ràng: “handler ghi aggregate”, không viết “aggregate được ghi” nếu chủ thể quan trọng.

Một đoạn văn nên truyền tải một ý hoàn chỉnh. Bullet chỉ dùng khi các mục thật sự song song; table chỉ dùng khi người đọc cần so sánh theo nhiều cột. Không biến mọi đoạn giải thích thành checklist.

## Mô tả flow

Một flow phải có:

- trigger bắt đầu;
- happy path theo đúng thứ tự;
- transaction boundary;
- dữ liệu hoặc side effect sinh ra;
- response quay về đâu;
- failure path quan trọng;
- file/class làm điểm vào.

Tên class không đủ để giải thích flow. Phải nói class nhận gì, quyết định gì và chuyển quyền kiểm soát cho ai.

## Bản đồ file

Không liệt kê mọi file chỉ để chứng minh tài liệu đầy đủ. Nhóm file theo trách nhiệm và chỉ ra điểm bắt đầu:

```text
presentation → nhận protocol input
application  → điều phối use case
domain       → bảo vệ invariant
infrastructure → nói chuyện với database/service ngoài
```

Khi một file chỉ là barrel hoặc wiring, nói rõ điều đó để người đọc không tìm business logic ở sai nơi.

## Đồng bộ với code

Mọi command, port, environment variable, endpoint và file path phải kiểm tra được trong code hiện tại. Khi hạ tầng hoặc flow đổi, PR thay đổi code phải cập nhật chương sở hữu thông tin đó.

Reviewer kiểm tra ba câu:

1. Tài liệu có nói đúng code đang làm không?
2. Một người mới có biết vì sao code làm như vậy không?
3. Người đó có thể tự chạy hoặc lần theo flow để xác nhận không?
