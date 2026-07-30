# Deployment readiness

> **Phần IV · Chương 17 — Kiểm tra khả năng triển khai**
>
> Chương trước: [Render adapter](render-deployment.md) · [Mục lục handbook](README.md) · Chương sau: [Release process](release-process.md)

Starter này không cần có một production deployment đang chạy. Nó cần có một deployment contract đủ rõ để dự án được tạo từ starter có thể đi từ local tới VPS, EC2 hoặc provider khác bằng cách thay environment và composition root, không thay business code.

## 1. Những gì phải đúng trước khi gọi là deployable

Backend production-like phải có đủ năm vai trò:

```text
Caddy → API → PostgreSQL
      → Worker → Redis
```

- API nhận HTTP, Socket.IO, outbox polling và queue producer.
- Worker dùng cùng immutable server image nhưng chỉ tiêu thụ BullMQ.
- PostgreSQL và Redis nằm trên network nội bộ; dữ liệu nằm trên volume hoặc managed service.
- Migration chạy một lần trước rollout, không chạy lặp trong API và worker startup.
- Caddy là public TLS boundary; API không tự chịu trách nhiệm terminate TLS.

Nguồn thực thi là [`deploy/compose/compose.production.yaml`](../deploy/compose/compose.production.yaml). Có thể diễn tập trên Ubuntu/WSL2. Chạy được ở local chứng minh process boundary và health contract; chưa chứng minh domain, TLS, firewall, backup hoặc public DNS.

## 2. Gate local không cần provider

Từ repository root:

```bash
pnpm verify:env
pnpm verify:compose
pnpm verify:docs
pnpm --filter=server verify
pnpm --filter=admin verify:production
```

Để kiểm tra topology thật trên Ubuntu, tạo `deploy/compose/.env.production` từ example, pull image theo commit SHA, chạy migration one-off rồi gọi `deploy/compose/scripts/verify.sh`. File environment chứa secret phải có quyền `600` và không được commit.

Đây là gate bắt buộc cho starter. Nó không cần AWS account, Render project, Vercel project hay backend public.

## 3. Vercel là integration tùy chọn

Repository có đúng hai frontend deployable: Admin và Client. Mỗi project phải trỏ đúng root directory (`apps/admin` hoặc `apps/client`). Không tạo project `web` hoặc trỏ Vercel vào repository root.

Admin production build bắt buộc có `VITE_API_URL` vì browser cần biết HTTP và WebSocket origin để sinh CSP. Build CI dùng `https://api.ci.example.invalid` chỉ để kiểm tra artifact; đây không phải backend thật.

Vercel Preview chỉ usable khi có API staging public và CORS cho preview origin:

```text
VITE_API_URL=https://api.staging.example.com
```

Nếu starter chưa có backend public, Vercel Preview không phải quality gate của repository. Có hai lựa chọn: tắt/không bắt buộc Vercel Preview check, hoặc cấu hình API staging thật rồi đặt `VITE_API_URL` trong Vercel Preview.

Không điền localhost vào Vercel, không dùng API production cho mọi preview, và không điền URL giả rồi coi preview là usable. URL giả chỉ phù hợp với CI artifact build.

## 4. Khi chuyển sang môi trường thật

Người dùng starter cần cung cấp domain API và domain Admin/Client, database/Redis/secrets, CORS, cookie policy, object storage, backup/restore, firewall và monitoring.

Checklist sau deploy:

1. `/health/live` và `/health/ready` trả 2xx.
2. Migration đã chạy đúng release.
3. Login, refresh sau reload và logout hoạt động.
4. Route authorization và notification mark-read đúng user ownership.
5. Socket.IO trả `101`, nhận notification và force logout.
6. Caddy cấp TLS đúng domain; CSP cho đúng API/WSS origin.
7. Worker xử lý queue; outbox không tăng liên tục.
8. Restore backup được thử trong môi trường cô lập.

Khi các mục trên chưa có bằng chứng, deployment chỉ là “container đang chạy”, chưa phải release production.

### Mail worker contract

`MAIL_ENABLED` là quyết định vận hành rõ ràng. Khi bằng `false`, worker vẫn nhận email job nhưng hoàn tất job với
trạng thái `sent: false` và log lý do skip; nó không retry vào một SMTP host rỗng. Khi bằng `true`, server và worker
chỉ khởi động nếu có `MAIL_HOST` và `MAIL_FROM`; `MAIL_PORT` phải là port hợp lệ. Production bật mail phải dùng SMTP
provider thật. Deployment drill có thể để mail tắt để kiểm tra outbox/queue, hoặc trỏ vào Mailpit/Maildev để kiểm tra
nội dung email end-to-end.
