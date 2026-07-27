# Sổ tay vận hành (Operations Runbook)

Tài liệu này trả lời câu hỏi "đang có sự cố, giờ làm gì" — khác với [Phát triển và triển khai](development-and-deployment.md) vốn mô tả hệ thống được dựng và phát hành ra sao.

Nguyên tắc chung khi xử lý sự cố: **khôi phục dịch vụ trước, tìm nguyên nhân sau**. Nhưng trước khi restart hay xóa gì, hãy chụp lại bằng chứng (log, số đo, trạng thái) — restart xong là mất dấu vết.

## 1. Ba phút đầu tiên

Chạy đúng thứ tự này để biết mình đang ở đâu:

```bash
# 1. Process còn sống không?
curl -s https://<api-host>/health/live

# 2. Phụ thuộc còn nối được không? (database, redis)
curl -s https://<api-host>/health/ready

# 3. Số đo hiện tại — outbox có tắc không, request có chậm không?
curl -s https://<api-host>/metrics | grep -E "outbox_|http_request_duration_seconds_count"
```

Với backend trên Render có thể kiểm tra live, ready và CORS trong một lệnh:

```powershell
$env:API_URL = "https://<api>.onrender.com"
$env:ADMIN_ORIGIN = "https://<admin>.vercel.app"
pnpm verify:render
```

Topology, biến môi trường và quy trình provision nằm tại [Render deployment](render-deployment.md).

Cách đọc kết quả:

| Kết quả                                                 | Nghĩa là                                  | Đi tiếp tới |
| ------------------------------------------------------- | ----------------------------------------- | ----------- |
| `/health/live` không trả lời                            | Process chết hoặc không nhận được traffic | Mục 3.1     |
| `/health/live` OK nhưng `/health/ready` trả 503         | App sống nhưng mất kết nối database/Redis | Mục 3.2     |
| Cả hai OK nhưng `outbox_oldest_pending_age_seconds` lớn | Event không được phát đi                  | Mục 3.3     |
| Cả hai OK, người dùng báo không nhận được email         | Worker không chạy hoặc job kẹt            | Mục 3.4     |

## 2. Ngưỡng cảnh báo đề xuất

Đặt cảnh báo trên các số đo do `/metrics` cung cấp. Ngưỡng dưới đây là điểm khởi đầu hợp lý — chỉnh theo lưu lượng thật sau vài tuần quan sát.

| Số đo                                 | Cảnh báo khi         | Vì sao ngưỡng đó                                                                                |
| ------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------- |
| `outbox_oldest_pending_age_seconds`   | > 60 liên tục 5 phút | Publisher quét mỗi 100 ms; event chờ quá một phút nghĩa là vòng lặp đang hỏng, không phải chậm. |
| `outbox_events{status="failed"}`      | > 0                  | Event `FAILED` đã thử 10 lần và bị bỏ lại; không tự phục hồi, luôn cần người xem.               |
| `outbox_events{status="processing"}`  | > 50 kéo dài         | Nhiều claim bị treo — thường do worker/instance chết giữa chừng.                                |
| `http_request_duration_seconds` (p95) | > 1s                 | Người dùng bắt đầu cảm nhận được độ trễ.                                                        |
| Tỷ lệ response 5xx                    | > 1% trong 5 phút    | Ngưỡng lỗi nền chấp nhận được cho hầu hết sản phẩm.                                             |
| `/health/ready` trả 503               | 2 lần liên tiếp      | Một lần có thể là nhiễu mạng; hai lần là sự cố phụ thuộc.                                       |

## 3. Kịch bản xử lý sự cố

### 3.1 API không phản hồi

1. Kiểm tra tiến trình/pod còn chạy không và log lần crash gần nhất.
2. Nếu process khởi động rồi chết ngay: gần như luôn là **cấu hình môi trường**. `validateEnvironment` cố tình cho ứng dụng chết ngay lúc boot khi thiếu biến bắt buộc hoặc secret production ngắn hơn 32 ký tự — đọc dòng log đầu tiên, nó nói rõ biến nào sai.
3. Nếu chết vì không tìm thấy module: image được build sai; quay lui về image tag trước đó (mục 4.2).
4. Nếu process sống nhưng không nhận traffic: kiểm tra cổng (`PORT`) và cấu hình proxy/ingress.

### 3.2 `/health/ready` trả 503

Body của response chỉ rõ thành phần nào hỏng:

```json
{ "status": "error", "checks": { "database": "down", "redis": "up" } }
```

**Database down:** kiểm tra managed database còn sống, số kết nối đã chạm trần chưa, và mật khẩu/URL có vừa bị đổi không. App sẽ tự phục hồi khi database trở lại — không cần restart, trừ khi log cho thấy pool kết nối đã hỏng hẳn.

**Redis down:** người dùng đang đăng nhập vẫn dùng được access token cho tới khi hết hạn (15 phút), nhưng **không ai refresh được** và realtime ngừng hoạt động. Redis phục hồi thì phiên vẫn còn (dữ liệu nằm trong Redis, mất Redis là mất phiên — người dùng phải đăng nhập lại).

Trong lúc chờ: bật readiness probe để orchestrator ngừng đẩy traffic vào instance hỏng, nhưng **đừng** tắt liveness probe — process vẫn khỏe, restart chỉ làm mọi thứ tệ hơn.

### 3.3 Outbox tắc (event không được phát)

Chẩn đoán trước, đừng vội xóa gì:

```sql
-- Phân bố trạng thái và event cũ nhất còn chờ
SELECT status, count(*), min(occurred_at) FROM outbox_events GROUP BY status;

-- Vì sao thất bại? Cột last_error ghi nguyên nhân
SELECT type, attempts, last_error, occurred_at
FROM outbox_events WHERE status = 'FAILED' ORDER BY occurred_at DESC LIMIT 10;
```

| Triệu chứng                                                | Nguyên nhân thường gặp                                            | Hành động                                                                                                                      |
| ---------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Nhiều row `PENDING`, `attempts` = 0, tuổi tăng dần         | Publisher không chạy — app không khởi động đủ, hoặc timer đã dừng | Kiểm tra log khởi động; restart instance API                                                                                   |
| Nhiều row `PROCESSING` lâu hơn 60 giây                     | Instance nhận việc rồi chết giữa chừng                            | Không cần làm gì: `recoverStaleClaims` tự trả chúng về `PENDING` sau 60 giây. Nếu không tự phục hồi, publisher đang không chạy |
| Row `PENDING` có `attempts` tăng dần, `last_error` lặp lại | Consumer thất bại thật (Redis/queue lỗi)                          | Sửa phụ thuộc trong `last_error`; publisher tự thử lại với thời gian chờ tăng dần, tối đa 60 giây                              |
| Row `FAILED`                                               | Đã thử 10 lần, hệ thống bỏ cuộc                                   | Sửa nguyên nhân, sau đó phát lại thủ công (bên dưới)                                                                           |

Phát lại event `FAILED` sau khi đã sửa nguyên nhân — chỉ làm khi hiểu rõ event đó gây ra side effect gì, vì consumer sẽ chạy lại:

```sql
UPDATE outbox_events
SET status = 'PENDING', attempts = 0, available_at = now(), locked_at = NULL
WHERE id = '<id cụ thể>';
```

Không bao giờ xóa row outbox để "cho sạch" — đó là bằng chứng duy nhất cho biết chuyện gì đã xảy ra mà chưa được xử lý.

### 3.4 Email không được gửi

Kiến trúc: API chỉ đẩy job vào queue; **worker là process riêng** mới thật sự gửi. Người dùng không nhận được mail nhưng API vẫn bình thường thì gần như chắc chắn worker có vấn đề.

1. Worker process còn chạy không? (`node dist/worker.js`)
2. Job có nằm trong queue không — nếu job chất đống ở trạng thái `waiting` thì đúng là không có consumer.
3. Job ở trạng thái `failed`: đọc lỗi; thường là SMTP sai cấu hình hoặc nhà cung cấp mail từ chối.
4. Bật lại worker: job tồn đọng sẽ được xử lý ngay, **không mất mát** — đó là lý do dùng queue bền thay vì gửi trực tiếp.

### 3.5 Nghi ngờ tài khoản bị chiếm quyền

Theo mức độ leo thang:

1. **Thu hồi một phiên cụ thể:** trang Sessions trong Admin, hoặc `DELETE /auth/sessions/:jti`.
2. **Giữ phiên hiện tại, thu hồi các thiết bị khác:** `POST /auth/sessions/revoke-others` bằng refresh cookie hiện tại.
3. **Đá tài khoản khỏi mọi thiết bị:** `POST /auth/logout/global` — vừa xóa phiên refresh trong Redis, vừa tăng `tokenVersion` nên access token đang lưu hành chết ngay lập tức, không phải chờ hết 15 phút.
4. **Khóa hẳn tài khoản:** `PATCH /users/:id/deactivate` — chặn đăng nhập, thu hồi phiên và đẩy sự kiện ép đăng xuất qua realtime.

Refresh token là single-use. Rotation dùng Lua script atomic trong Redis; nếu log xuất hiện 401 với thông điệp “already been used, revoked, or expired”, trước tiên kiểm tra client có gửi đồng thời cùng refresh token từ nhiều replica/tab hay không. Không sửa sự cố bằng cách quay lại chuỗi `GET → SET → DEL`, vì thao tác không atomic sẽ cho phép replay sinh nhiều session. BFF đã gom request trong từng Next instance; khi chạy nhiều replica, một request cạnh tranh có thể bị từ chối và đây là behavior an toàn mặc định. 4. **Nghi ngờ toàn hệ thống bị lộ:** xoay vòng JWT secret (mục 5) — mọi token hiện có lập tức vô hiệu, tất cả người dùng phải đăng nhập lại.

Sau mọi thao tác: đối chiếu `/audit-logs` để dựng lại dòng thời gian kẻ tấn công đã làm gì.

### 3.6 Lần theo dấu vết một request cụ thể

Mọi response đều mang header `x-correlation-id`. Xin người báo lỗi giá trị đó (hoặc lấy từ log proxy), rồi lọc log theo trường `correlationId` — pino xuất JSON nên lọc được bằng công cụ, không phải grep chuỗi.

Correlation ID đi xuyên suốt: từ HTTP request → row `outbox_events` (cột `correlation_id`) → job BullMQ → log của worker. Vì vậy lần được từ một email đã gửi ngược về request đã sinh ra nó:

```sql
-- Từ correlation ID, xem những event nào đã phát sinh
SELECT type, status, occurred_at FROM outbox_events WHERE correlation_id = '<id>';
```

Job nền hoặc script chạy ngoài request HTTP sẽ có `correlation_id` rỗng — đó là bình thường, không phải lỗi.

### 3.7 Lần theo lỗi từ Admin Portal

Admin Portal chuyển lỗi không dự kiến qua `src/lib/observability.ts`. Mỗi report có `id`, `occurredAt`, `source`, `operation` và route. Nếu lỗi là response API, report có thêm `correlationId` lấy từ header `x-correlation-id`; dùng giá trị này để nối incident trình duyệt với backend log theo quy trình mục 3.6.

Trong development, structured report xuất hiện dưới nhãn `[AdminObservability]`. Reporter đồng thời phát browser event `admin:observability-error`. Production integration đăng ký một sink qua `configureObservabilitySink` và chuyển report tới provider đã chọn. Boundary không được import trực tiếp SDK Sentry/OpenTelemetry vì việc đó làm policy redact, sampling và failure isolation bị phân tán.

Payload đã loại bearer token, JWT và các assignment nhạy cảm phổ biến. Đây là lớp phòng thủ cuối, không phải lý do để đính kèm request body, cookie, authorization header hay toàn bộ auth store. Khi điều tra:

1. Tìm incident theo `id` hoặc thời điểm, route và operation.
2. Nếu có `correlationId`, lọc backend structured log bằng đúng giá trị đó.
3. Theo correlation ID sang audit log, outbox event hoặc worker job nếu flow có side effect bất đồng bộ.
4. Nếu telemetry provider đang lỗi, ứng dụng vẫn hoạt động; kiểm tra provider health riêng, không coi telemetry outage là application outage.

Trước production go-live phải chọn provider, cấu hình sampling/rate limit, upload source map riêng tư và chốt retention/access policy. Không public source map trên CDN.

## 4. Quy trình phát hành

Cách phiên bản được đánh số, release PR là gì và image nhận tag `1.x.y` lúc nào — xem [Quy trình phát hành](release-process.md). Phần dưới đây là góc nhìn vận hành: đưa một bản đã phát hành lên môi trường chạy thật.

### 4.1 Phát hành bình thường

```text
merge vào main
→ CI chạy quality + e2e, build image, quét trivy, đẩy image gắn tag SHA lên GHCR
→ merge release PR khi muốn phát hành → tag vX.Y.Z, image có thêm tag phiên bản
→ chạy job migration (prisma migrate deploy) — MỘT lần, không phải mỗi replica
→ triển khai image mới cho API
→ triển khai cùng image đó cho worker (entry: node dist/worker.js)
→ chờ /health/ready xanh
→ chạy smoke test
→ theo dõi 15 phút: tỷ lệ lỗi, độ trễ p95, độ trễ outbox
```

Thứ tự quan trọng: **migration chạy trước** và phải tương thích ngược, vì trong lúc triển khai luân phiên sẽ có cả code cũ lẫn code mới cùng nói chuyện với một database.

Với Admin trên Vercel, sau khi deployment báo Ready:

1. Mở trực tiếp `/users` và `/roles` trong tab mới; cả hai phải trả SPA, không phải Vercel 404.
2. Kiểm tra response có `nosniff`, frame deny, referrer policy, permissions policy và COOP.
3. Kiểm tra HTML có CSP với đúng API HTTPS và WebSocket WSS origin.
4. Login, reload protected route, tải avatar và xác nhận realtime reconnect không bị CSP chặn.
5. Kiểm tra asset hashed có cache immutable, HTML không cache, và deployment không phục vụ file `.map`.

Nếu browser console báo CSP violation, không sửa bằng `default-src *`, `connect-src https:` hoặc thêm `unsafe-eval`. Xác định resource mới thuộc directive nào, thêm đúng origin vào generator `createContentSecurityPolicy`, bổ sung test rồi deploy lại. Nếu direct route 404, kiểm tra project Root Directory có đúng `apps/admin` và deployment có đọc `apps/admin/vercel.json` hay không.

### 4.2 Quay lui (rollback)

```bash
# Quay lui = triển khai lại tag phiên bản trước đó (ví dụ đang 1.1.0 → về 1.0.0)
docker pull ghcr.io/<org>/<repo>/server:1.0.0

# Cần chính xác từng commit thì dùng tag SHA — bất biến, truy vết tuyệt đối
docker pull ghcr.io/<org>/<repo>/server:<sha-trước-đó>
```

Quay lui ứng dụng thì an toàn. **Quay lui database thì không** — repo không dùng down migration. Nếu bản phát hành mới có migration phá vỡ tương thích, quay lui code sẽ khiến code cũ gặp schema mới. Đó chính là lý do mọi thay đổi schema phải theo kiểu expand/contract (thêm cái mới → chuyển dần → mới bỏ cái cũ), để code cũ và mới cùng sống được với một schema.

## 5. Xoay vòng secret

**JWT secret** (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`): sinh giá trị mới bằng `openssl rand -hex 32`, cập nhật secret của môi trường, triển khai lại. Hệ quả tức thì: **mọi người dùng bị đăng xuất** vì token cũ không còn xác minh được. Chỉ làm khi nghi ngờ lộ secret, hoặc trong cửa sổ bảo trì đã báo trước.

**Mật khẩu database**: đổi ở managed database, cập nhật `DATABASE_URL`, triển khai lại. App sẽ trả 503 ở `/health/ready` trong khoảng thời gian giữa hai bước — nên làm khi lưu lượng thấp.

**Mật khẩu Redis**: tương tự, kèm hệ quả mất phiên đăng nhập nếu Redis bị xóa dữ liệu trong quá trình.

Sau khi xoay vòng, kiểm tra `.env.example` xem có biến mới nào cần khai báo không, và xác nhận gitleaks vẫn sạch.

## 6. Việc định kỳ

| Việc                                         | Tần suất             | Ghi chú                                                                          |
| -------------------------------------------- | -------------------- | -------------------------------------------------------------------------------- |
| Xem PR của Dependabot                        | Hàng tuần            | Gộp bản vá bảo mật sớm; CI đã chặn CVE mức HIGH                                  |
| Diễn tập khôi phục từ backup                 | Hàng quý             | Backup chưa từng khôi phục thử thì chưa phải backup                              |
| Xem lại quyền và tài khoản admin             | Hàng quý             | Gỡ tài khoản không còn cần                                                       |
| Kiểm tra kích thước bảng `outbox_events`     | Hàng quý             | Đã tự dọn mỗi giờ theo `OUTBOX_RETENTION_DAYS`; chỉ cần xác nhận nó thật sự chạy |
| Kiểm tra sàn coverage và các mục nợ kỹ thuật | Mỗi lần lập kế hoạch | Xem mục technical debt trong README                                              |
