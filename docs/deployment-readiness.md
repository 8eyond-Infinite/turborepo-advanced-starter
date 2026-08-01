# Deployment readiness

> **Phần IV · Chương 16 — Kiểm tra khả năng triển khai**
>
> Chương trước: [Deployment contract](provider-neutral-deployment.md) · [Mục lục handbook](README.md) · Chương sau: [Release process](release-process.md)

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

Đây là gate bắt buộc cho starter. Nó không cần tài khoản cloud, Vercel project hay backend public.

## 3. Vercel là integration tùy chọn

Repository có đúng hai frontend deployable: Admin và Client. Mỗi project phải trỏ đúng root directory (`apps/admin` hoặc `apps/client`). Không tạo project `web` hoặc trỏ Vercel vào repository root.

Admin production build bắt buộc có `VITE_API_URL` vì browser cần biết HTTP và WebSocket origin để sinh CSP. Build CI dùng `https://api.ci.example.invalid` chỉ để kiểm tra artifact; đây không phải backend thật.

Vercel Preview chỉ usable khi có API staging public và CORS cho preview origin:

```text
VITE_API_URL=https://api.staging.example.com
```

Nếu starter chưa có backend public, Vercel Preview không phải quality gate bắt buộc của repository. Có hai chế độ rõ ràng:

- **Artifact-only:** đặt `VITE_API_URL`/`API_URL` thành một origin `.invalid` và tạo `SESSION_SECRET` riêng cho Preview. Deployment phải build xanh nhưng login/API không được coi là usable.
- **Usable Preview:** triển khai API staging thật, cấu hình CORS cho preview origin và đặt URL staging vào cả hai project.

Không điền localhost vào Vercel, không dùng API production cho mọi preview, và không gọi artifact-only Preview là môi trường kiểm thử end-to-end. Production phải có environment riêng; không tái sử dụng Preview session secret.

## 4. Khi chuyển sang môi trường thật

Người dùng starter cần cung cấp domain API và domain Admin/Client, database/Redis/secrets, CORS, cookie policy, object storage, backup/restore, firewall và monitoring.

Checklist sau deploy:

1. `/health/live` và `/health/ready` trả 2xx.
2. `/metrics` trả `401` khi thiếu credential và trả HTTP/outbox/BullMQ/backup series khi gửi đúng Bearer `METRICS_TOKEN`.
3. Migration đã chạy đúng release.
4. Login, refresh sau reload và logout hoạt động.
5. Route authorization và notification mark-read đúng user ownership.
6. Socket.IO trả `101`, nhận notification và force logout.
7. Caddy cấp TLS đúng domain; CSP cho đúng API/WSS origin.
8. Worker xử lý queue; outbox không tăng liên tục.
9. Restore backup được thử trong môi trường cô lập.
10. Prometheus đã nạp `deploy/observability/alerts.yml`, scrape job tên `turborepo-api` và đường cảnh báo đã được thử.
11. `AUDIT_RETENTION_DAYS` là `0`, hoặc số ngày đã có owner phê duyệt cùng archive/legal-hold procedure.
12. `CLIENT_URL` tạo đúng link `/reset-password`, SMTP nhận được mail, token dùng lại bị từ chối và session cũ chết sau khi đổi mật khẩu.
13. Nếu `EMAIL_VERIFICATION_REQUIRED=true`, link `/verify-email` mở đúng Client, token chỉ dùng một lần, resend không làm lộ email tồn tại và bootstrap admin vẫn đăng nhập được.

Khi các mục trên chưa có bằng chứng, deployment chỉ là “container đang chạy”, chưa phải release production.

### Mail worker contract

`MAIL_ENABLED` là quyết định vận hành rõ ràng. Khi bằng `false`, worker vẫn nhận email job nhưng hoàn tất job với
trạng thái `sent: false` và log lý do skip; nó không retry vào một SMTP host rỗng. Khi bằng `true`, server và worker
chỉ khởi động nếu có `MAIL_HOST` và `MAIL_FROM`; `MAIL_PORT` phải là port hợp lệ. Production bật mail phải dùng SMTP
provider thật. Deployment drill có thể để mail tắt để kiểm tra outbox/queue, hoặc trỏ vào Mailpit/Maildev để kiểm tra
nội dung email end-to-end.

Không bật `EMAIL_VERIFICATION_REQUIRED` trên production phục vụ user thật trong khi `MAIL_ENABLED=false`. Trạng thái đó không làm container unhealthy, nhưng làm user mới mắc kẹt sau đăng ký. Release checklist phải kiểm tra cả queue worker lẫn một email xác minh nhận thật.

### Backup/restore drill

`scripts/backup-postgres.sh` tạo PostgreSQL custom-format dump với permission riêng tư và checksum SHA-256 trong
`deploy/compose/backups`. `scripts/verify-postgres-restore.sh <backup.dump>` kiểm tra checksum, restore vào một database
cô lập có tên `restore_verify_*`, xác nhận có bảng rồi tự xóa database kiểm tra. Script không restore đè database live.

Scheduler gọi `scripts/backup-and-verify.sh`, không gọi hai script rời. Một cycle chỉ được coi là thành công sau khi dump
mới restore được. `BACKUP_RETENTION_DAYS` để trống thì không xóa gì; chỉ đặt số ngày sau khi bản mã hóa đã được đẩy sang
storage khác host và quá trình lấy lại bản off-host đã được thử. Retention chỉ chạy sau restore thành công và chỉ xóa cặp
`.dump`/`.sha256` đúng tên database trong thư mục backup đã resolve; script từ chối filesystem root.

`deploy/systemd/` cung cấp service/timer mẫu chạy mỗi ngày. Unit giả định repo ở `/opt/turborepo-starter`, user/group
`turborepo`; phải sửa ba giá trị này theo host thật trước khi cài.

Khi `OFFSITE_BACKUP_ENABLED=true`, cycle gọi `backup-offsite.sh` sau restore verifier. Script dùng Restic để mã hóa dump và
checksum trước khi gửi tới repository S3/SFTP/REST ở máy khác. Repository phải được khởi tạo trước; script cố ý không tự
`restic init`, vì một URL gõ sai không được phép âm thầm tạo nơi lưu mới. Local retention bị từ chối nếu off-host backup chưa
bật hoặc upload thất bại. Nhờ vậy một lỗi mạng không thể làm cycle xóa bản local cuối cùng.

Chỉ khi toàn bộ cycle thành công, script mới atomically thay `BACKUP_STATUS_FILE` (mặc định
`deploy/compose/backup-status/.last-success`). File này là heartbeat của backup, không phải bản backup. Timer health chạy mỗi giờ và
gọi `verify-backup-freshness.sh`; mặc định status quá 26 giờ, bị thiếu hoặc thiếu field sẽ làm unit fail. Vì backup chính chạy
mỗi ngày và có random delay tối đa 15 phút, ngưỡng 26 giờ chừa khoảng đệm nhưng vẫn phát hiện một cycle bị bỏ lỡ.
