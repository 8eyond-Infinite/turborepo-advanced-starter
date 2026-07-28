# Quy chuẩn viết tài liệu của repository

Tài liệu này dành cho người viết và reviewer. Người mới học dự án nên bắt đầu ở [Handbook](README.md), không cần đọc quy chuẩn này trước.

## Mục tiêu

Một chương tốt phải giúp người chưa biết hệ thống hình dung được các phần liên quan, tìm đúng code và tự kiểm tra hiểu biết. Nó không chỉ liệt kê thư mục hoặc lặp lại tên class.

## Khung của một chương

Tùy độ dài, chương nên trả lời theo thứ tự:

1. Chương này giúp người đọc làm được gì?
2. Cần đọc/chạy gì trước?
3. Vấn đề hoặc câu chuyện nghiệp vụ là gì?
4. Cách hình dung đơn giản nhất là gì?
5. Flow đi qua những bước và file nào?
6. Vì sao boundary/decision hiện tại tồn tại?
7. Khi có lỗi thì flow dừng ở đâu, và quy tắc nào luôn phải được giữ?
8. Người đọc tự kiểm tra bằng cách nào?
9. Chương tiếp theo là gì?

Không bắt buộc biến chín câu hỏi thành chín heading cứng nhắc. Mục tiêu là giữ mạch kể tự nhiên.

## Văn phong

Viết cho một lập trình viên biết TypeScript nhưng chưa biết repository. Giải thích thuật ngữ ở lần xuất hiện đầu tiên hoặc link tới glossary. Dùng câu chủ động và chủ thể rõ ràng: “handler ghi aggregate”, không viết “aggregate được ghi” nếu chủ thể quan trọng.

Một đoạn văn nên truyền tải một ý hoàn chỉnh. Bullet chỉ dùng khi các mục thật sự song song; table chỉ dùng khi người đọc cần so sánh theo nhiều cột. Không biến mọi đoạn giải thích thành checklist.

### Viết ý đời thường trước, gắn thuật ngữ sau

Link tới glossary chỉ là đường thoát khi người đọc quên một từ; nó không thay thế phần giải thích ngay trong chương. Khi một khái niệm khó xuất hiện lần đầu, hãy viết theo thứ tự:

```text
chuyện gì đang xảy ra bằng lời thường
→ vì sao ta cần cách làm này
→ tên kỹ thuật của cách làm
→ file nào hiện thực nó
```

Không viết:

> Seed idempotent đối với role, permission và menu, nhưng không đổi password của admin đã tồn tại.

Viết:

> Lệnh seed nạp bộ dữ liệu ban đầu để hệ thống có quyền, vai trò, menu và tài khoản quản trị. Có thể chạy lại lệnh này mà không tạo thêm bản ghi trùng; tính chất đó được gọi là _idempotent_. Riêng mật khẩu của tài khoản quản trị chỉ được đặt khi tài khoản được tạo lần đầu. Chạy seed lần nữa không thay mật khẩu cũ.

Người đọc phải hiểu đoạn văn ngay cả khi bỏ từ in nghiêng đi.

### Không nén nhiều tầng suy luận vào một câu

Một câu không nên vừa mô tả hành vi, giải thích kiến trúc, nêu failure mode và đưa ra mệnh lệnh vận hành. Tách chúng thành một chuỗi ngắn:

1. Lệnh vừa làm gì?
2. Kết quả nào chứng minh bước đó thành công?
3. Kết quả đó chưa chứng minh được điều gì?
4. Người đọc làm gì tiếp theo?

Ví dụ, `seed exit 0` chỉ chứng minh script kết thúc không lỗi. Nó chưa chứng minh người vận hành nhớ đúng mật khẩu. Vì vậy tài liệu phải yêu cầu thử đăng nhập trước khi xóa mật khẩu bootstrap.

### Phép thử dành cho người mới

Reviewer đọc từng section và tự hỏi:

- Một người biết TypeScript nhưng chưa biết DDD có kể lại được đoạn này bằng lời của họ không?
- Mỗi lệnh có nói rõ chạy ở terminal nào, dùng để làm gì và kết quả mong đợi là gì không?
- Một từ tiếng Anh có đang thay thế cho phần giải thích đáng lẽ phải viết ra không?
- Người đọc có phải mở ba tài liệu khác chỉ để hiểu một đoạn văn không?

Nếu câu trả lời cuối là “có”, section đó chưa đạt dù thông tin kỹ thuật hoàn toàn chính xác.

## Mô tả flow

Một flow phải có:

- trigger bắt đầu;
- đường đi khi mọi bước thành công, theo đúng thứ tự;
- transaction boundary;
- dữ liệu hoặc side effect sinh ra;
- response quay về đâu;
- những chỗ quan trọng có thể thất bại và hệ thống phản ứng thế nào;
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
