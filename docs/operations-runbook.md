# Sổ tay vận hành (Operations Runbook)

> **Phần IV · Chương 18 — Khi hệ thống gặp sự cố**
>
> Chương trước: [Release process](release-process.md) · [Mục lục handbook](README.md) · Chương sau: không có

Đây là cuốn hướng dẫn “hệ thống đang có vấn đề, bây giờ kiểm tra gì?”. Bạn không cần nhớ kiến trúc để bắt đầu. Hãy tìm triệu chứng giống điều mình đang thấy rồi làm từng bước theo thứ tự.

Mỗi kịch bản trả lời bốn câu:

1. **Người dùng đang thấy gì?**
2. **Chạy lệnh nào để kiểm tra?**
3. **Kết quả đó có nghĩa gì?**
4. **Hành động nào an toàn tiếp theo?**

Trước khi restart, rollback hoặc sửa dữ liệu, hãy lưu lại thời điểm, log và trạng thái container. Những thao tác đó có thể làm mất dấu vết giúp tìm nguyên nhân.

> Nếu bạn chỉ muốn học cách hệ thống được dựng và triển khai, hãy đọc [Phát triển và triển khai](development-and-deployment.md). Runbook này ưu tiên hành động nhanh khi có sự cố.

## 1. Ba phút đầu tiên

Mục tiêu ba phút đầu không phải sửa ngay. Mục tiêu là xác định lỗi nằm ở đường mạng, process API, database/Redis hay phần xử lý nền.

Đầu tiên, ghi lại:

```text
Thời điểm bắt đầu lỗi:
Môi trường:
URL hoặc màn hình bị lỗi:
Commit/image đang chạy:
Thay đổi gần nhất:
```

Sau đó kiểm tra API từ ngoài vào trong.

### Bước 1 — API có nhận được request không?

```bash
curl --fail --silent --show-error https://<api-host>/health/live
```

Kết quả 2xx nghĩa là process API đang chạy và request đi qua được DNS/proxy. Timeout, lỗi kết nối hoặc 5xx nghĩa là đi tới [API không phản hồi](#31-api-không-phản-hồi).

### Bước 2 — API có kết nối được database và Redis không?

```bash
curl --fail --silent --show-error https://<api-host>/health/ready
```

Kết quả 2xx nghĩa là cả hai dependency chính đang sẵn sàng. `503` nghĩa là process API còn sống nhưng ít nhất một dependency đang lỗi; đi tới [`/health/ready` trả 503](#32-healthready-trả-503).

### Bước 3 — Process nào đang chạy và log gần nhất nói gì?

Với single-node Compose:

```bash
cd deploy/compose

docker compose \
  --env-file .env.production \
  -f compose.production.yaml \
  ps

docker compose \
  --env-file .env.production \
  -f compose.production.yaml \
  logs --since 10m --tail 200 api worker caddy
```

`api`, `postgres` và `redis` phải healthy; `worker` cùng `caddy` phải `Up`. Đọc dòng `ERROR` đầu tiên theo thời gian, không chỉ đọc dòng lỗi cuối cùng vì lỗi sau thường là hệ quả.

### Bước 4 — Kiểm tra đúng hợp đồng public

Với Compose:

```bash
ADMIN_ORIGIN=https://<admin-host> scripts/verify.sh
```

Verifier kiểm tra liveness, readiness và CORS. Nếu health đều xanh nhưng một nghiệp vụ vẫn lỗi, chuyển tới kịch bản cụ thể bên dưới.

### Chọn kịch bản tiếp theo

| Kết quả                                                 | Nghĩa là                                  | Đi tiếp tới |
| ------------------------------------------------------- | ----------------------------------------- | ----------- |
| `/health/live` không trả lời                            | Process chết hoặc không nhận được traffic | Mục 3.1     |
| `/health/live` OK nhưng `/health/ready` trả 503         | App sống nhưng mất kết nối database/Redis | Mục 3.2     |
| Cả hai OK nhưng `outbox_oldest_pending_age_seconds` lớn | Event không được phát đi                  | Mục 3.3     |
| Cả hai OK, người dùng báo không nhận được email         | Worker không chạy hoặc job kẹt            | Mục 3.4     |

Topology và lệnh deploy/rollback được giải thích tại [Triển khai backend không phụ thuộc nhà cung cấp](provider-neutral-deployment.md).

## 2. Ngưỡng cảnh báo đề xuất

Phần này dành cho người cấu hình hệ thống giám sát, không cần đọc để xử lý sự cố đầu tiên.

`/metrics` trả các con số để Prometheus hoặc dịch vụ giám sát thu thập. Production yêu cầu header `Authorization: Bearer <METRICS_TOKEN>`; token này là secret chỉ dành cho scraper, không đưa vào frontend hoặc URL. Ví dụ kiểm tra thủ công mà không để token xuất hiện trong history:

```bash
read -rsp "Metrics token: " METRICS_TOKEN && echo
curl --fail --silent --show-error \
  -H "Authorization: Bearer ${METRICS_TOKEN}" \
  https://<api-host>/metrics
unset METRICS_TOKEN
```

Không có token hoặc token sai phải trả `401`. Ngưỡng dưới đây là điểm bắt đầu, không phải chân lý cho mọi sản phẩm. Sau vài tuần, hãy điều chỉnh theo lưu lượng thật và số liệu bình thường của hệ thống.

Các ngưỡng cốt lõi đã được mã hóa tại `deploy/observability/alerts.yml`. Prometheus scrape job phải tên `turborepo-api`.
File rules không tự cài Prometheus hay Alertmanager và cũng không quyết định người nào nhận cảnh báo; deployment thật phải nạp
file này vào monitoring provider, cấu hình route nhận cảnh báo rồi thử một alert end-to-end.

| Số đo                                                       | Cảnh báo khi           | Vì sao ngưỡng đó                                                                                |
| ----------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------- |
| `outbox_oldest_pending_age_seconds`                         | > 60 liên tục 5 phút   | Publisher quét mỗi 100 ms; event chờ quá một phút nghĩa là vòng lặp đang hỏng, không phải chậm. |
| `outbox_events{status="failed"}`                            | > 0                    | Event `FAILED` đã thử 10 lần và bị bỏ lại; không tự phục hồi, luôn cần người xem.               |
| `outbox_events{status="processing"}`                        | > 50 kéo dài           | Nhiều claim bị treo — thường do worker/instance chết giữa chừng.                                |
| `bullmq_jobs{queue="user-queue",status="waiting"}`          | tăng liên tục 5 phút   | Producer còn chạy nhưng worker không theo kịp hoặc đã dừng.                                     |
| `bullmq_jobs{queue="user-queue",status="failed"}`           | > 0                    | Có job hết retry; đọc worker log theo job/correlation ID trước khi retry thủ công.              |
| `bullmq_oldest_waiting_job_age_seconds{queue="user-queue"}` | > 60 liên tục 5 phút   | Email/side effect đã chờ quá lâu dù queue có thể chưa nhiều job.                                |
| `http_request_duration_seconds` (p95)                       | > 1s                   | Người dùng bắt đầu cảm nhận được độ trễ.                                                        |
| Tỷ lệ response 5xx                                          | > 5% trong 10 phút     | Rule còn yêu cầu có traffic đáng kể để tránh chia tỷ lệ trên vài request lẻ.                    |
| `/health/ready` trả 503                                     | 2 lần liên tiếp        | Một lần có thể là nhiễu mạng; hai lần là sự cố phụ thuộc.                                       |
| `backup_status_available`                                   | = 0 trong 10 phút      | API đã được cấu hình đọc heartbeat nhưng file bị thiếu hoặc volume/permission sai.              |
| `backup_age_seconds`                                        | > 93.600 trong 15 phút | Không có cycle thành công trong 26 giờ; đã bỏ lỡ lịch backup hằng ngày.                         |

## 3. Kịch bản xử lý sự cố

### 3.1 API không phản hồi

**Người dùng thấy:** trang báo mất kết nối, request timeout hoặc gateway trả `502/504`.

**Kiểm tra process trước:**

```bash
docker compose \
  --env-file deploy/compose/.env.production \
  -f deploy/compose/compose.production.yaml \
  ps api caddy

docker compose \
  --env-file deploy/compose/.env.production \
  -f deploy/compose/compose.production.yaml \
  logs --since 10m --tail 200 api caddy
```

Đọc kết quả theo thứ tự:

1. **API liên tục restart:** tìm dòng lỗi đầu tiên của lần khởi động gần nhất.
2. **Log nói thiếu biến hoặc secret quá ngắn:** sửa environment. `validateEnvironment` chủ động dừng app trước khi nhận traffic để tránh chạy với cấu hình không an toàn.
3. **Log có `MODULE_NOT_FOUND`:** image build thiếu runtime dependency. Không cài package trực tiếp vào container; rollback về image trước.
4. **API `Up` nhưng Caddy không gọi được:** kiểm tra API có lắng nghe đúng `PORT=3001`, hai service có chung network và Caddy có `reverse_proxy api:3001`.
5. **Cả API lẫn Caddy đều `Up` nhưng URL public timeout:** kiểm tra DNS, firewall và cổng 80/443 của host.

**Khi nào restart?** Chỉ restart sau khi đã lưu log và xác định lỗi tạm thời. Nếu cấu hình hoặc image sai, restart không thay đổi đầu vào nên chỉ tạo thêm log giống nhau.

### 3.2 `/health/ready` trả 503

**Người dùng thấy:** API có thể trả lời `/health/live`, nhưng request cần database hoặc Redis bắt đầu lỗi. Load balancer thường loại instance khỏi danh sách nhận traffic.

Đọc body của `/health/ready`; nó chỉ rõ dependency nào đang down:

```json
{ "status": "error", "checks": { "database": "down", "redis": "up" } }
```

#### Nếu database down

Kiểm tra database service/container, disk, số connection và thay đổi gần nhất của `DATABASE_URL`. Không in connection string ra ticket hoặc chat vì nó chứa password.

Khi database hoạt động lại, API thường tự kết nối lại. Không restart hàng loạt instance cùng lúc vì chúng có thể tạo một đợt kết nối mới và làm database quá tải thêm.

#### Nếu Redis down

Access token đã cấp còn dùng được tối đa 15 phút, nhưng người dùng không thể refresh token; realtime và queue cũng dừng. Kiểm tra Redis service, password/TLS và disk nếu persistence được bật.

Nếu Redis chỉ restart nhưng dữ liệu vẫn còn, session có thể tiếp tục. Nếu dữ liệu Redis đã mất, người dùng phải đăng nhập lại và queue đang lưu trong Redis cũng cần được đánh giá.

**Không tắt liveness probe.** Process API vẫn sống; readiness `503` đã đủ để load balancer ngừng gửi traffic. Restart API không sửa được database hoặc Redis đang down.

### 3.3 Outbox tắc (event không được phát)

**Người dùng thấy:** thao tác chính đã lưu thành công nhưng email, notification, cache invalidation hoặc việc nền liên quan không xảy ra.

Outbox là bảng lưu “việc cần phát đi sau khi transaction chính đã commit”. Trước tiên, xem các event đang ở trạng thái nào. Chạy SQL bằng công cụ database được môi trường cho phép:

```sql
-- Phân bố trạng thái và event cũ nhất còn chờ
SELECT status, count(*), min(occurred_at) FROM outbox_events GROUP BY status;

-- Vì sao thất bại? Cột last_error ghi nguyên nhân
SELECT type, attempts, last_error, occurred_at
FROM outbox_events WHERE status = 'FAILED' ORDER BY occurred_at DESC LIMIT 10;
```

Các trạng thái có nghĩa:

- `PENDING`: đang chờ publisher nhận.
- `PROCESSING`: đã có publisher nhận và đang xử lý.
- `PUBLISHED`: đã chuyển đi thành công.
- `FAILED`: đã thử hết số lần cho phép và cần con người xử lý.

| Triệu chứng                                                | Nguyên nhân thường gặp                                            | Hành động                                                                                                                      |
| ---------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Nhiều row `PENDING`, `attempts` = 0, tuổi tăng dần         | Publisher không chạy — app không khởi động đủ, hoặc timer đã dừng | Kiểm tra log khởi động; restart instance API                                                                                   |
| Nhiều row `PROCESSING` lâu hơn 60 giây                     | Instance nhận việc rồi chết giữa chừng                            | Không cần làm gì: `recoverStaleClaims` tự trả chúng về `PENDING` sau 60 giây. Nếu không tự phục hồi, publisher đang không chạy |
| Row `PENDING` có `attempts` tăng dần, `last_error` lặp lại | Consumer thất bại thật (Redis/queue lỗi)                          | Sửa phụ thuộc trong `last_error`; publisher tự thử lại với thời gian chờ tăng dần, tối đa 60 giây                              |
| Row `FAILED`                                               | Đã thử 10 lần, hệ thống bỏ cuộc                                   | Sửa nguyên nhân, sau đó phát lại thủ công (bên dưới)                                                                           |

Chỉ phát lại event `FAILED` sau khi đã sửa nguyên nhân và biết event đó sẽ làm gì. Consumer có thể gửi email, tạo notification hoặc gọi hệ thống ngoài lần nữa.

```sql
UPDATE outbox_events
SET status = 'PENDING', attempts = 0, available_at = now(), locked_at = NULL
WHERE id = '<id cụ thể>';
```

Lệnh phải nhắm đúng một `id`; kiểm tra row trước và sau khi update. Không update hàng loạt theo `status`.

Không xóa row outbox để “làm sạch”. Row đó là bằng chứng cho biết nghiệp vụ nào đã xảy ra nhưng phần xử lý sau đó chưa hoàn tất.

### 3.4 Email không được gửi

**Người dùng thấy:** thao tác tạo user hoặc vô hiệu hóa user thành công nhưng email không tới.

Trường hợp đăng ký công khai cũng đi qua worker khi email verification được bật. Nếu user báo “đăng ký xong nhưng không đăng nhập được”, kiểm tra `EMAIL_VERIFICATION_REQUIRED`, rồi xác nhận họ có nhận mail chứa `/verify-email` hay không. Có thể yêu cầu user dùng `/check-email` để gửi lại; không cần tạo account lần nữa.

API không gửi email trực tiếp. Nó đưa một job vào queue; worker là process riêng đọc job và gọi SMTP. Vì vậy cần tìm xem job đã đi tới đâu.

**Bước 1 — Worker có đang chạy không?**

```bash
docker compose \
  --env-file deploy/compose/.env.production \
  -f deploy/compose/compose.production.yaml \
  ps worker

docker compose \
  --env-file deploy/compose/.env.production \
  -f deploy/compose/compose.production.yaml \
  logs --since 15m --tail 200 worker
```

Worker phải `Up` và log startup có dòng đang consume queue.

**Bước 2 — Đọc trạng thái job:**

- Nhiều job `waiting`: worker không consume hoặc không kết nối được Redis.
- Job `active` quá lâu: worker bị treo giữa quá trình xử lý.
- Job `failed`: đọc lỗi gần nhất; thường là SMTP host/credential/TLS hoặc provider từ chối người gửi.
- Không có job: quay lại outbox; event có thể chưa được publisher chuyển vào queue.

**Bước 3 — Khôi phục:** sửa Redis/SMTP hoặc khởi động lại worker sau khi đã lưu log. Job còn trong queue sẽ được xử lý tiếp. Không tạo lại user chỉ để kích hoạt email lần nữa vì sẽ tạo nghiệp vụ trùng.

Với email xác minh, resend tạo token mới và vô hiệu link cũ. Endpoint luôn trả `202`, nên response giống nhau không chứng minh job đã được tạo; đối chiếu worker log và SMTP provider. Không truy vấn token gốc trong PostgreSQL vì database chỉ có SHA-256 hash.

### 3.5 Nghi ngờ tài khoản bị chiếm quyền

**Người dùng thấy:** thiết bị lạ trong danh sách session, hành động audit không nhận ra hoặc tài khoản tiếp tục hoạt động sau khi đã logout.

Chọn hành động nhỏ nhất đủ để chặn rủi ro:

| Mức độ | Mục tiêu                                  | Hành động                                                         |
| ------ | ----------------------------------------- | ----------------------------------------------------------------- |
| 1      | Chỉ loại một thiết bị cụ thể              | Sessions trong Admin hoặc `DELETE /auth/sessions/:jti`            |
| 2      | Giữ thiết bị hiện tại, loại thiết bị khác | `POST /auth/sessions/revoke-others`                               |
| 3      | Đăng xuất tài khoản khỏi mọi thiết bị     | `POST /auth/logout/global`                                        |
| 4      | Chặn tài khoản đăng nhập lại              | `PATCH /users/:id/deactivate`                                     |
| 5      | Nghi ngờ khóa ký token toàn hệ thống lộ   | Xoay JWT secret theo mục 5; mọi người dùng đều phải đăng nhập lại |

Global logout xóa mọi refresh session và tăng `tokenVersion`. Vì vậy cả refresh token lẫn access token đang lưu hành đều bị từ chối ngay, không cần chờ access token hết hạn sau 15 phút.

Refresh token chỉ được dùng một lần. Redis chạy một Lua script để kiểm tra token cũ, xóa nó và lưu token mới như một thao tác không thể bị request khác chen vào.

Hai request đồng thời từ nhiều tab hoặc nhiều BFF replica phải nhận cùng kết quả refresh nhờ replay 5 giây trong Redis. Nếu log vẫn có `401` với thông điệp “already been used, revoked, or expired”, kiểm tra theo thứ tự: hai request có cách nhau quá 5 giây không; session có vừa bị logout/revoke không; Redis có restart hoặc evict key không. Không tăng cửa sổ replay để che lỗi hạ tầng vì khoảng thời gian dài hơn cũng kéo dài thời gian token cũ có thể được gửi lại.

Không “sửa” bằng cách đổi về chuỗi `GET → SET → DEL`. Request khác có thể chen vào giữa ba lệnh và dùng lại cùng credential để sinh thêm session.

Sau khi chặn truy cập:

1. ghi lại ai yêu cầu xử lý và thời điểm;
2. đối chiếu `/audit-logs` để dựng lại hành động đáng ngờ;
3. kiểm tra email, role, permission và thông tin tài khoản có bị sửa không;
4. chỉ mở lại tài khoản sau khi chủ tài khoản đặt credential mới.

### 3.6 Lần theo dấu vết một request cụ thể

Mỗi response có header `x-correlation-id`: một mã dùng để nối các log thuộc cùng request. Khi nhận báo lỗi, hãy xin mã này hoặc lấy nó từ proxy log.

Client BFF gửi cùng header khi gọi API. Runtime log của Next.js có event JSON `client.bff.api_failed`; lọc theo `correlationId`, rồi dùng mã đó tìm tiếp trong API/worker log. Event đã bỏ query string và credential, vì vậy không bổ sung body hoặc token vào log khi điều tra thủ công.

Tìm đúng trường `correlationId` trong structured log. Đừng chỉ grep một đoạn message vì nhiều request có thể tạo message giống nhau.

Mã được truyền từ HTTP request sang audit log, outbox event, job BullMQ và worker log. Nhờ vậy có thể đi từ một request ban đầu tới hành động quản trị và email/job nền mà nó tạo ra:

```sql
-- Từ correlation ID, xem những event nào đã phát sinh
SELECT type, status, occurred_at FROM outbox_events WHERE correlation_id = '<id>';

-- Tìm hành động quản trị được ghi trong cùng request
SELECT action, user_email, created_at FROM audit_logs WHERE correlation_id = '<id>';
```

Nếu query trả row, dùng loại event và thời điểm để tìm tiếp trong API/worker log. Job được tạo bởi lịch chạy nền hoặc script không bắt đầu từ HTTP có thể không có correlation ID; đó là bình thường.

### 3.7 Lần theo lỗi từ Admin Portal

Khi Admin gặp lỗi không dự kiến, `src/lib/observability.ts` tạo một report gồm mã lỗi, thời điểm, màn hình và thao tác đang làm. Nếu lỗi tới từ API, report còn có correlation ID để tìm request tương ứng trong backend log.

Trong development, tìm report dưới nhãn `[AdminObservability]` ở browser console. Production gửi report tới provider đã cấu
hình qua `configureObservabilitySink`. Adapter chặn incident flood trước provider: mặc định tối đa 50 report/phút trên một tab
và 5 report cùng fingerprint/phút. Vì counter nằm trong memory của từng tab, quota và sampling phía provider vẫn là lớp bảo
vệ bắt buộc cho tổng lưu lượng của toàn bộ người dùng.

Report đã cố loại bearer token và JWT, nhưng người điều tra vẫn không được đính kèm request body, cookie, authorization header hoặc toàn bộ auth store vào ticket.

Đi theo thứ tự:

1. Tìm incident theo `id` hoặc thời điểm, route và operation.
2. Nếu có `correlationId`, lọc backend structured log bằng đúng giá trị đó.
3. Theo correlation ID sang audit log, outbox event hoặc worker job nếu flow có side effect bất đồng bộ.
4. Nếu nơi nhận telemetry đang lỗi, kiểm tra nó riêng; mất report không đồng nghĩa application cũng down.

Trước production cần chọn provider, cấu hình sampling/quota phía provider, upload source map ở chế độ riêng tư và quy định ai
được xem/lưu bao lâu. Không public source map trên CDN. Nếu report ít hơn số lỗi người dùng gặp, kiểm tra cả rate limit của
browser adapter lẫn sampling/rate limit của provider trước khi kết luận boundary không chạy.

Với Client BFF, tìm cả `client.bff.api_failed` và `client.bff.api_failures_suppressed`. Summary `scope=fingerprint` nghĩa là
cùng method/path/kind/status đang lặp; `scope=global` nghĩa là nhiều failure khác nhau đã chạm trần instance. `suppressedCount`
là số lũy kế trong cửa sổ hiện tại tại thời điểm summary được phát, không phải tổng chính xác cuối cùng. Counter là per-instance,
nên khi điều tra production nhiều replica phải tổng hợp log theo service và time range, không cộng một dòng cuối rồi coi là toàn
hệ thống.

## 4. Quy trình phát hành

Phần này là checklist dành cho người đưa một phiên bản đã được review lên môi trường chạy. Nếu chưa biết release PR, version và image tag là gì, hãy đọc [Quy trình phát hành](release-process.md) trước.

### 4.1 Phát hành bình thường

Một lần phát hành thành công phải đi qua đúng thứ tự sau:

```text
merge vào main
→ CI chạy quality + e2e, build Server/Client image, quét trivy, đẩy hai image gắn tag SHA lên GHCR
→ merge release PR khi muốn phát hành → tag vX.Y.Z, cả hai image có thêm cùng tag phiên bản
→ chạy job migration (prisma migrate deploy) — MỘT lần, không phải mỗi replica
→ triển khai image mới cho API
→ triển khai cùng image đó cho worker (entry: node dist/worker.js)
→ nếu self-host Client, triển khai Client image cùng version; nếu dùng Vercel, promote đúng source SHA
→ chờ /health/ready xanh
→ chạy smoke test
→ theo dõi 15 phút: tỷ lệ lỗi, độ trễ p95, độ trễ outbox
```

Migration chạy trước application mới. Trong lúc rollout, code cũ và code mới có thể cùng truy cập một database, nên migration phải giữ cho cả hai phiên bản sử dụng được schema.

Sau khi readiness xanh, chưa được coi deployment hoàn tất. Chạy smoke test trên những flow quan trọng nhất rồi theo dõi lỗi, thời gian response và outbox ít nhất 15 phút.

Với Admin trên Vercel, sau khi deployment báo Ready:

1. Mở trực tiếp `/users` và `/roles` trong tab mới; cả hai phải trả SPA, không phải Vercel 404.
2. Kiểm tra response có `nosniff`, frame deny, referrer policy, permissions policy và COOP.
3. Kiểm tra HTML có CSP với đúng API HTTPS và WebSocket WSS origin.
4. Login, reload protected route, tải avatar và xác nhận realtime reconnect không bị CSP chặn.
5. Kiểm tra asset hashed có cache immutable, HTML không cache, và deployment không phục vụ file `.map`.

Nếu browser console báo CSP violation, không sửa bằng `default-src *`, `connect-src https:` hoặc thêm `unsafe-eval`. Xác định resource mới thuộc directive nào, thêm đúng origin vào generator `createContentSecurityPolicy`, bổ sung test rồi deploy lại. Nếu direct route 404, kiểm tra project Root Directory có đúng `apps/admin` và deployment có đọc `apps/admin/vercel.json` hay không.

### 4.2 Quay lui (rollback)

Rollback nghĩa là chạy lại image đã hoạt động trước đó. Trước khi làm, ghi lại image hiện tại, image muốn quay về và trạng thái migration vừa chạy.

```bash
# Quay lui = triển khai lại tag phiên bản trước đó (ví dụ đang 1.1.0 → về 1.0.0)
docker pull ghcr.io/<org>/<repo>/server:1.0.0
docker pull ghcr.io/<org>/<repo>/client:1.0.0   # khi Client được self-host

# Cần chính xác từng commit thì dùng tag SHA — bất biến, truy vết tuyệt đối
docker pull ghcr.io/<org>/<repo>/server:<sha-trước-đó>
docker pull ghcr.io/<org>/<repo>/client:<sha-trước-đó>
```

Server và Client có thể rollback độc lập khi sự cố chỉ thuộc một phía. Change record phải ghi rõ version hoặc SHA thực tế của từng service sau rollback; không được ghi chung “hệ thống đang ở 1.0.0” nếu hai phía đang chạy khác version.

Repo không tự chạy migration ngược khi rollback. Image cũ sẽ gặp schema hiện tại của database.

Vì vậy chỉ rollback khi image cũ còn tương thích với schema mới. Thay đổi database phải theo ba đợt: thêm cấu trúc mới nhưng giữ cấu trúc cũ; chuyển code và dữ liệu sang cấu trúc mới; chỉ xóa cấu trúc cũ ở release sau. Cách làm này gọi là **expand/contract**.

Nếu chưa biết image cũ có tương thích không, dừng và đọc migration trước khi rollback; không thử trực tiếp trên production.

## 5. Xoay vòng secret

Xoay secret nghĩa là thay giá trị bí mật cũ bằng giá trị mới và cập nhật mọi service đang dùng nó. Đây là thay đổi có ảnh hưởng rộng; luôn ghi change/incident record và chuẩn bị cách quay lui cấu hình.

| Secret cần đổi     | Điều xảy ra ngay                                                          | Kiểm tra sau thay đổi                         |
| ------------------ | ------------------------------------------------------------------------- | --------------------------------------------- |
| JWT access/refresh | Mọi token cũ mất hiệu lực; tất cả người dùng phải đăng nhập lại           | Login, refresh, `/users/me`, Socket.IO        |
| Database password  | API mất readiness cho tới khi `DATABASE_URL` mới được triển khai          | `/health/ready`, query đọc và một mutation    |
| Redis password     | Refresh, session, queue và realtime lỗi cho tới khi app dùng password mới | Refresh token, worker log, Socket.IO và queue |

Sinh JWT secret độc lập bằng:

```bash
openssl rand -hex 32
```

Không dùng cùng một giá trị cho access và refresh token. Không in secret vào log hoặc truyền qua chat.

Với database hoặc Redis managed, đổi credential ở nhà cung cấp rồi cập nhật secret của application trong cùng cửa sổ bảo trì. Khoảng giữa hai bước có thể gây `503`; thực hiện khi lưu lượng thấp và theo dõi readiness.

Sau khi hoàn tất, kiểm tra `.env.example` nếu tên biến thay đổi và xác nhận secret scan vẫn sạch.

### 5.1 Admin đã được seed nhưng không còn biết password

Production trước tiên dùng flow tự phục vụ: mở Client `/forgot-password`, nhập email admin, lấy mail từ SMTP provider rồi đặt mật khẩu mới. Link chỉ sống 30 phút và dùng một lần; thành công thu hồi mọi session. Nếu form luôn báo đã nhận yêu cầu nhưng không có mail, kiểm tra worker log `Password reset request could not be scheduled`/`Password reset email`, BullMQ và cấu hình `CLIENT_URL`, `MAIL_ENABLED`, `MAIL_HOST`, `MAIL_FROM`. Không tìm token gốc trong PostgreSQL: database chỉ giữ hash và BullMQ xóa payload nhạy cảm sau khi job kết thúc.

Phần script bên dưới chỉ dành cho bài lab single-node khi mail cố ý tắt. Production không được bỏ qua recovery flow bằng cách update database trực tiếp; trường hợp khẩn cấp phải có xác minh danh tính, change record và phê duyệt của tổ chức.

Đầu tiên, xác định loại lỗi đăng nhập:

- `400` là DTO/validation fail; kiểm tra email, JSON và password tối thiểu sáu ký tự;
- `401 INVALID_CREDENTIALS` nghĩa là request đã tới login handler nhưng user không tồn tại hoặc password không khớp;
- `200` nghĩa là credential đúng; không in response body vì nó chứa token.

Sau đó kiểm tra database có tài khoản admin hay chưa. Query chỉ trả số lượng và không đọc password hash:

```bash
docker compose \
  --env-file deploy/compose/.env.production \
  -f deploy/compose/compose.production.yaml \
  exec -T postgres \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT count(*) FROM users WHERE email = '\''admin@example.com'\'';"'
```

Kết quả `0` nghĩa là admin chưa được tạo; quay về [quy trình tạo dữ liệu ban đầu](provider-neutral-deployment.md#34-tạo-dữ-liệu-ban-đầu-và-tài-khoản-quản-trị). Kết quả `1` nghĩa là tài khoản có tồn tại. Chạy seed lại không đổi mật khẩu của tài khoản này.

Chỉ trong lab chưa có dữ liệu thật, có thể chạy reset một lần từ application image. Lệnh nhập password ở chế độ ẩn, băm nó bằng cùng thư viện bcrypt và chỉ update đúng `admin@example.com`:

```bash
read -rsp "New admin password (minimum 12 characters): " RESET_PASSWORD
echo

docker compose \
  --env-file deploy/compose/.env.production \
  -f deploy/compose/compose.production.yaml \
  exec -T -e RESET_PASSWORD="$RESET_PASSWORD" api \
  node -e '
const bcrypt = require("bcrypt");
const { Client } = require("pg");
(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const hash = await bcrypt.hash(process.env.RESET_PASSWORD, 10);
  const result = await client.query(
    `UPDATE users SET password = $1, "updatedAt" = NOW() WHERE email = $2`,
    [hash, "admin@example.com"],
  );
  await client.end();
  if (result.rowCount !== 1) throw new Error(`Updated ${result.rowCount} rows`);
  console.log("Admin password reset successfully.");
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});'

unset RESET_PASSWORD
```

Kết quả đúng là `Admin password reset successfully.` Ngay sau đó login qua địa chỉ public và chỉ kiểm tra HTTP status; không in response body chứa token.

Nếu đây không phải lab trống, không dùng đoạn script trên. Việc reset phải xác nhận danh tính người yêu cầu, có incident/change record và thu hồi session theo chính sách sản phẩm.

### 5.2 Realtime không xuất hiện trong browser

Admin chỉ mở Socket.IO sau khi auth store có access token. Trong DevTools, chọn **Network → WS**, bật Preserve log rồi reload protected route; Fetch/XHR không hiển thị WebSocket. Connection đúng có URL:

```text
ws://<api-host>/socket.io/?EIO=4&transport=websocket
```

và status `101 Switching Protocols`. Đối chiếu phía API:

```bash
docker compose \
  --env-file deploy/compose/.env.production \
  -f deploy/compose/compose.production.yaml \
  logs --since 5m api \
  | grep -E 'Socket.IO|connected on socket|Rejecting socket'
```

Nếu browser không có request và server không có log, kiểm tra CSP `connect-src`, `VITE_API_URL` và auth state. Nếu request có nhưng handshake bị từ chối, API ghi `Rejecting socket`: ngoài chữ ký và hạn token, gateway còn kiểm tra user active, `tokenVersion` và session JTI trong Redis giống HTTP. Admin nhận mã `REALTIME_AUTHENTICATION_FAILED` sẽ logout. Lỗi mạng không có mã này không được phá phiên HTTP; kiểm tra network, proxy và API availability trong khi Socket.IO tự reconnect. Lỗi CORS/CSP xảy ra trước khi gateway chấp nhận connection.

## 6. Việc định kỳ

| Việc                                         | Tần suất             | Ghi chú                                                                          |
| -------------------------------------------- | -------------------- | -------------------------------------------------------------------------------- |
| Xem PR của Dependabot                        | Hàng tuần            | Gộp bản vá bảo mật sớm; CI đã chặn CVE mức HIGH                                  |
| Diễn tập khôi phục từ backup                 | Hàng quý             | Backup chưa từng khôi phục thử thì chưa phải backup                              |
| Kiểm tra timer và bản backup mới nhất        | Hàng tuần            | Health timer chạy mỗi giờ; operator vẫn xem alert route và snapshot off-host     |
| Xem lại quyền và tài khoản admin             | Hàng quý             | Gỡ tài khoản không còn cần                                                       |
| Kiểm tra kích thước bảng `outbox_events`     | Hàng quý             | Đã tự dọn mỗi giờ theo `OUTBOX_RETENTION_DAYS`; chỉ cần xác nhận nó thật sự chạy |
| Xem lại audit retention/legal hold           | Hàng quý             | Mặc định tắt; không bật hoặc đổi số ngày nếu chưa có owner của policy            |
| Kiểm tra sàn coverage và các giới hạn đã ghi | Mỗi lần lập kế hoạch | Xem phần giới hạn/mở rộng tiếp theo trong handbook của application hoặc context  |

### 6.1 Khi backup timer thất bại

```bash
systemctl status turborepo-backup.service --no-pager
journalctl -u turborepo-backup.service --since '2 days ago' --no-pager
systemctl status turborepo-backup-health.service --no-pager
./deploy/compose/scripts/verify-backup-freshness.sh
```

Phân biệt bốn checkpoint trong log: dump được tạo; checksum/restore cô lập pass; Restic upload hoàn tất; retention hoàn tất.
Nếu dump tạo được nhưng restore hoặc upload fail, giữ nguyên file để điều tra và không xóa backup cũ. Dùng
`restic snapshots --host <RESTIC_HOST> --tag postgres` để xác nhận repository nhìn thấy snapshot. Nếu Restic báo không mở được
repository, kiểm tra URL, password file và credential storage; không chạy `restic init` lại trên một URL chưa xác minh.

Nếu disk đầy, không tăng retention hoặc xóa tay trước khi xác nhận có bản off-host dùng được. Sửa nguyên nhân rồi chạy lại
`sudo systemctl start turborepo-backup.service`; không cần
restart API/worker vì backup dùng `pg_dump` qua PostgreSQL container đang chạy.

Health service fail không nhất thiết database backup đang chạy dở; nó nói rằng **chưa có bằng chứng về một cycle thành công
đủ mới**. Không sửa timestamp của `.last-success` bằng tay. Kiểm tra log backup chính, sửa nguyên nhân rồi chạy lại toàn bộ
backup service. Chỉ cycle thật sự pass mới được cập nhật heartbeat.

### 6.2 Khi audit retention báo lỗi

Tìm log context `AuditRetentionService`. Cleanup fail-open nên API vẫn phục vụ; điều đó không có nghĩa lỗi có thể bị bỏ qua,
vì bảng tiếp tục tăng và policy dữ liệu không được thực thi. Kiểm tra kết nối database, quyền `DELETE`, migration index và disk.
Không xóa tay theo phỏng đoán. Query read-only trước:

```sql
SELECT COUNT(*) AS expired_rows
FROM audit_logs
WHERE "createdAt" < NOW() - INTERVAL '<retention days> days';
```

Nếu `AUDIT_RETENTION_DAYS=0`, không có cleanup là behavior đúng. Trước khi đổi sang số dương, xác nhận bằng văn bản thời hạn,
archive đã lấy lại thử được và không có legal hold. Thay đổi policy qua deployment configuration rồi quan sát log count; không
chạy câu `DELETE` ad-hoc trong incident.
