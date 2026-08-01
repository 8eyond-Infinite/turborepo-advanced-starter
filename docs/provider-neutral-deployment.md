# Triển khai backend không phụ thuộc nhà cung cấp

> **Phần IV · Chương 15 — Một lần build, nhiều nơi chạy**
>
> Chương trước: [Development và Docker](development-and-deployment.md) · [Mục lục handbook](README.md) · Chương sau: [Deployment readiness](deployment-readiness.md)

Chương này trả lời một câu hỏi thực tế: cần chạy những chương trình nào để backend phục vụ được người dùng, và phải khởi động chúng theo thứ tự nào để không làm hỏng dữ liệu?

Hãy hình dung một nhà hàng nhỏ. Caddy là cửa đón khách; API là nhân viên nhận yêu cầu; worker là khu xử lý việc nền; PostgreSQL là sổ cái; Redis là bảng công việc nhanh. Migration là việc sửa cấu trúc sổ trước ca làm. Không nhân viên API nào được tự sửa sổ mỗi lần bắt đầu ca.

Năm vai trò trên và thứ tự khởi động của chúng tạo thành **quy ước triển khai** (deployment contract) của dự án. Ta sẽ diễn tập quy ước đó trên Ubuntu/WSL2. Sau này chuyển sang VPS, máy ảo hoặc một nền tảng container, tên dịch vụ có thể đổi nhưng trách nhiệm của từng vai trò vẫn giữ nguyên.

## 1. Phạm vi và mức bảo đảm

Nguồn sự thật có thể thực thi cho single-node deployment là [`deploy/compose/compose.production.yaml`](../deploy/compose/compose.production.yaml). Topology gồm:

```text
Internet hoặc máy local
        │ :80/:443
        ▼
      Caddy
        │ private application network
        ▼
       API
        │
        ├── PostgreSQL ─ persistent volume
        └── Redis ────── append-only persistent volume

Worker ─── PostgreSQL + Redis
```

API và worker dùng đúng một immutable image nhưng là hai process có lifecycle riêng. PostgreSQL và Redis chỉ nằm trên Docker internal network; host không publish cổng database. Caddy là process duy nhất nhận traffic từ ngoài.

Đây là topology production-like để học, staging và chạy workload nhỏ trên một node. Nó không cung cấp high availability: nếu host, disk hoặc Docker daemon chết thì cả hệ thống dừng. Production có dữ liệu quan trọng nên thay PostgreSQL/Redis bằng managed service, thay local upload bằng object storage và giữ nguyên API/worker image.

## 2. Artifact và release contract

CI build `apps/server/Dockerfile` một lần, quét image rồi publish:

```text
ghcr.io/<organization>/<repository>/server:<commit-sha>
```

Production phải deploy commit SHA hoặc release version. Không dùng `latest`, vì tag đó có thể trỏ tới artifact khác mà không có thay đổi trong deployment config. `SERVER_IMAGE_TAG` chính là version đang chạy và là đầu vào rollback.

Image cung cấp bốn entrypoint:

| Process   | Command                    | Trách nhiệm                                       |
| --------- | -------------------------- | ------------------------------------------------- |
| API       | `node dist/main.js`        | HTTP, WebSocket, outbox publisher, queue producer |
| Worker    | `node dist/worker.js`      | BullMQ consumer và side effect nền                |
| Migration | `node scripts/migrate.mjs` | Áp migration đã commit đúng một lần mỗi release   |
| Seed      | `node scripts/seed.mjs`    | Bootstrap dữ liệu/admin có chủ đích, idempotent   |

Migration là release step, không phải API startup hook. Seed không nằm trong deploy thường ngày.

## 3. Chuẩn bị local production-like environment

### 3.1 Chọn đúng môi trường

Bài diễn tập gần VPS nhất trên Windows là một Ubuntu WSL2 có `systemd` và Docker Engine riêng. Docker CLI trong Ubuntu phải là `/usr/bin/docker`; nếu `which docker` trỏ vào `/mnt/c/Program Files/Docker/...` thì terminal đang dùng Docker Desktop integration, chưa phải daemon độc lập cần kiểm tra.

```bash
which docker
docker version
docker compose version
systemctl is-active docker
docker run --rm hello-world
```

Kết quả đúng có cả phần Client và Server, Compose có version, service trả `active`, và `hello-world` chạy thành công. Khi dùng daemon độc lập này, thoát Docker Desktop để không nuôi đồng thời hai VM/daemon và tránh tranh RAM, disk hoặc cổng 80/443.

Clone repository vào filesystem Linux, chẳng hạn `~/workspaces`, thay vì `/mnt/c` hoặc `/mnt/d`. Cách này gần filesystem của VPS hơn và tránh chi phí bind mount, permission cùng file-watching xuyên Windows/Linux.

### 3.2 Xác thực artifact bất biến

CI chỉ đẩy image theo SHA sau khi commit trên `main` vượt qua toàn bộ quality gate. Với package GHCR private, đăng nhập GitHub CLI trong chính Ubuntu rồi chuyển token qua standard input; đăng nhập trên Windows không tự truyền sang WSL:

```bash
gh auth login --hostname github.com --git-protocol https --web
gh auth refresh --hostname github.com --scopes read:packages
gh auth token | docker login ghcr.io --username <github-user> --password-stdin

IMAGE_TAG="$(git rev-parse HEAD)"
docker manifest inspect \
  "ghcr.io/<organization>/<repository>/server:${IMAGE_TAG}" >/dev/null
```

`unauthorized` nghĩa là registry chưa xác thực hoặc tài khoản chưa có quyền đọc package; nó chưa chứng minh image không tồn tại. Trên VPS, ưu tiên token/deploy credential chỉ có `read:packages`. File Docker config chứa credential phải chỉ người vận hành đọc được; không copy token vào `.env.production`, shell command hoặc tài liệu.

### 3.3 Tạo environment và deploy

Sao chép file mẫu nhưng không commit file thật. Trên Linux, tạo file với quyền hẹp ngay từ đầu:

```bash
install -m 600 \
  deploy/compose/.env.production.example \
  deploy/compose/.env.production
```

Điền các nhóm biến:

- `SERVER_IMAGE` và `SERVER_IMAGE_TAG` nhận diện artifact;
- `POSTGRES_*`, `DATABASE_URL`, `REDIS_PASSWORD` là datastore credential;
- hai JWT secret độc lập, tối thiểu 32 ký tự;
- `CORS_ORIGINS` là exact browser origins, không có slash cuối;
- `CLIENT_URL` là origin HTTPS của Client nhận link password reset; bài drill loopback dùng `http://localhost:3005`;
- `API_ADDRESS=http://localhost` cho diễn tập local;
- SMTP và storage provider theo môi trường.

`POSTGRES_PASSWORD` xuất hiện cả ở bootstrap database lẫn `DATABASE_URL`; hai giá trị phải khớp. Dùng secret URL-safe để tránh encode sai connection URL. Sinh secret bằng:

```bash
openssl rand -hex 32
```

Đặt `SERVER_IMAGE` thành GHCR image và `SERVER_IMAGE_TAG` thành SHA vừa kiểm tra. Sau đó validate manifest và chạy script chuẩn:

```bash
docker compose \
  --env-file deploy/compose/.env.production \
  -f deploy/compose/compose.production.yaml \
  config --quiet

deploy/compose/scripts/deploy.sh
deploy/compose/scripts/verify.sh
```

`deploy.sh` pull đúng image theo SHA, dựng datastore, chạy migration một lần rồi mới khởi động API, worker và Caddy. Bước triển khai đầu tiên hoàn tất khi verifier báo `live, ready`; API, PostgreSQL và Redis đều healthy; worker cùng Caddy ở trạng thái `Up`. Container migration kết thúc sau khi làm xong việc, không chạy thường trực.

### 3.4 Tạo dữ liệu ban đầu và tài khoản quản trị

Database mới chỉ có cấu trúc bảng sau khi migration chạy xong. Nó chưa có danh sách quyền, vai trò, menu hoặc tài khoản để đăng nhập. Lệnh `seed` nạp bộ dữ liệu ban đầu này.

Người vận hành tự chọn mật khẩu quản trị, lưu nó vào password manager rồi truyền cho đúng một lần chạy seed. Biến `ALLOW_PRODUCTION_SEED=true` là chốt an toàn: nếu không bật nó một cách có chủ ý, image production sẽ từ chối chạy seed.

Không cần sửa chốt đó thành `true` trong `.env.production`. Ta chỉ bật nó cho đúng command bên dưới:

```bash
read -rsp "Admin password (minimum 12 characters): " SEED_PASSWORD
echo

ALLOW_PRODUCTION_SEED=true \
SEED_ADMIN_PASSWORD="$SEED_PASSWORD" \
docker compose \
  --env-file deploy/compose/.env.production \
  -f deploy/compose/compose.production.yaml \
  --profile tools \
  run --rm seed
```

Seed có thể chạy lại mà không nhân đôi role, permission hoặc menu. Tính chất “chạy nhiều lần vẫn cho cùng một kết quả cuối” được gọi là **idempotent**.

Mật khẩu là ngoại lệ có chủ ý. Seed chỉ đặt mật khẩu khi tạo tài khoản admin lần đầu; nếu tài khoản đã tồn tại, seed giữ nguyên mật khẩu cũ. Quy tắc này ngăn một lần deploy vô tình đổi credential của người đang vận hành hệ thống.

Vì vậy ta cần xác nhận hai việc riêng:

1. Database đã có đúng một tài khoản `admin@example.com`.
2. Mật khẩu vừa chọn thật sự đăng nhập được qua địa chỉ public của API.

Lệnh đầu chỉ trả về số lượng tài khoản, không đọc password hash:

```bash
docker compose \
  --env-file deploy/compose/.env.production \
  -f deploy/compose/compose.production.yaml \
  exec -T postgres \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT count(*) FROM users WHERE email = '\''admin@example.com'\'';"'
```

Kết quả mong đợi là `1`. Sau đó gửi request đăng nhập qua Caddy ở `http://localhost`:

```bash
LOGIN_STATUS="$(
  curl --silent --output /dev/null --write-out '%{http_code}' \
    --request POST \
    --header 'Content-Type: application/json' \
    --data "{\"email\":\"admin@example.com\",\"password\":\"${SEED_PASSWORD}\"}" \
    http://localhost/auth/login
)"
echo "Login HTTP status: ${LOGIN_STATUS}"
```

`Login HTTP status: 200` nghĩa là email và mật khẩu đúng. Lúc này mới xóa biến tạm khỏi terminal bằng `unset SEED_PASSWORD`, rồi xóa `SEED_ADMIN_PASSWORD` khỏi file nếu trước đó đã ghi nó vào đó.

Nếu API trả `400`, dữ liệu gửi lên sai định dạng; hãy đọc response để biết field nào không hợp lệ. Nếu API trả `401`, email không tồn tại hoặc mật khẩu không khớp. Chạy seed lại không giải quyết trường hợp sai mật khẩu vì seed không thay credential của tài khoản đã có.

### 3.5 Smoke test từ browser

Admin development trên Windows dùng:

```dotenv
VITE_API_URL=http://localhost
```

CORS phải chứa chính xác `http://localhost:5173`. Không trỏ Admin vào `localhost:3001`, vì API chỉ expose trong Docker network; browser đi qua Caddy ở port 80. Smoke test hoàn chỉnh gồm:

1. login thành công;
2. `/users?page=1&limit=10` trả `200` từ remote address port 80;
3. reload protected route vẫn giữ/khôi phục session;
4. Network → WS có `ws://localhost/socket.io/?EIO=4&transport=websocket` trả `101 Switching Protocols`;
5. API log có `User ... connected on socket ...`;
6. logout làm protected route không còn truy cập được.

Health xanh chỉ chứng minh dependency sẵn sàng; nó không thay thế kiểm tra auth, cookie, authorization và realtime.

## 4. Đưa lên một VPS

VPS tối thiểu để diễn tập nên có Ubuntu LTS, 2 GB RAM, public IPv4 và DNS record trỏ tới IP đó. Chỉ mở SSH, HTTP và HTTPS ở firewall/security group. Không mở PostgreSQL hoặc Redis ra Internet.

Trên server:

1. Cài Docker Engine và Compose plugin từ nguồn chính thức.
2. Clone hoặc copy riêng thư mục `deploy/compose`.
3. Tạo `.env.production`, quyền file `chmod 600`.
4. Đăng nhập GHCR bằng token chỉ có quyền đọc package.
5. Đặt `API_ADDRESS=api.example.com` và email ACME thật.
6. Đặt `SERVER_IMAGE_TAG` bằng SHA/version đã qua CI.
7. Chạy `deploy/compose/scripts/deploy.sh`.
8. Chạy `deploy/compose/scripts/verify.sh` với `ADMIN_ORIGIN` nếu cần kiểm tra CORS.

Caddy tự xin và gia hạn certificate khi DNS đã trỏ đúng, cổng 80/443 tới được server và `API_ADDRESS` là hostname public. Không đặt Cloudflare proxy hoặc firewall sai trước khi lần xin certificate đầu tiên hoàn tất.

## 5. Deploy flow

`deploy.sh` thực hiện theo thứ tự:

```text
validate manifest và immutable tag
→ pull API/worker/migration image
→ bảo đảm PostgreSQL + Redis healthy
→ chạy migration one-off
→ rollout API + worker + Caddy
→ chờ API readiness
```

Nếu migration fail, application version mới không được rollout. Nếu API không healthy, lệnh deploy fail và operator phải đọc log trước khi restart hoặc rollback.

Deploy script không tự seed, không xóa volume và không thay đổi firewall.

## 6. Rollback

Rollback application:

```bash
deploy/compose/scripts/rollback.sh <previous-commit-sha-or-version>
```

Script pull image cũ, thay API/worker và chờ readiness. Nó không rollback database. Vì vậy migration production phải theo chiến lược expand/contract:

1. thêm schema tương thích ngược;
2. deploy code dùng được cả schema cũ/mới;
3. backfill;
4. chỉ xóa schema cũ ở release sau.

Nếu migration phá tương thích ngược, image rollback có thể không chạy được dù container khởi động.

## 7. Dữ liệu và storage

Named volume tồn tại sau `docker compose down`, nhưng bị xóa bởi `docker compose down --volumes`. Không dùng lệnh sau trên môi trường có dữ liệu cần giữ.

`STORAGE_PROVIDER=local` gắn upload vào `uploads_data`, phù hợp single-node drill. Nó không phù hợp multi-replica và không phải backup. Production thật đặt `STORAGE_PROVIDER=s3` cùng bucket/credential riêng.

PostgreSQL trong Compose chỉ nên dùng khi đã có:

- backup tự động sang một máy/bucket khác;
- retention rõ ràng;
- mã hóa secret và backup;
- restore drill đã chạy thành công;
- disk usage alert.

Nếu chưa đáp ứng, dùng managed PostgreSQL.

### Tự động hóa backup trên một VPS

Sau khi backup và restore thủ công đã pass, cài timer mẫu. Trước hết sửa `User`, `Group`, `WorkingDirectory`, `ExecStart`
và `ReadWritePaths` trong hai file dưới `deploy/systemd` cho đúng host. User chạy service phải đọc được repo, ghi được thư
mục backup và truy cập Docker socket.

```bash
sudo cp deploy/systemd/turborepo-backup.service /etc/systemd/system/
sudo cp deploy/systemd/turborepo-backup.timer /etc/systemd/system/
sudo cp deploy/systemd/turborepo-backup-health.service /etc/systemd/system/
sudo cp deploy/systemd/turborepo-backup-health.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now turborepo-backup.timer
sudo systemctl enable --now turborepo-backup-health.timer
sudo systemctl start turborepo-backup.service
sudo systemctl status turborepo-backup.service --no-pager
sudo systemctl list-timers turborepo-backup.timer --no-pager
```

Service chạy `backup-and-verify.sh`: tạo dump/checksum, restore vào database cô lập, gửi bản mã hóa ra khỏi host, rồi mới
dọn local backup quá hạn. Ba bước đầu phải thành công trong cùng cycle; nếu upload lỗi thì local retention không chạy.

Starter dùng [Restic](https://restic.net/) làm adapter off-host vì cùng một command làm việc với S3-compatible storage, SFTP
và Rest server. Cài Restic trên host, tạo file password nằm ngoài repository với quyền `600`, rồi khởi tạo repository đúng
một lần bằng `restic init`. Sau đó đặt `OFFSITE_BACKUP_ENABLED=true`, `RESTIC_REPOSITORY`, `RESTIC_PASSWORD_FILE` và một
`RESTIC_HOST` ổn định trong `.env.production`. Credential của storage được cấp bằng biến môi trường mà backend Restic tương
ứng yêu cầu; tài khoản này chỉ nên được đọc/ghi đúng backup repository.

Không commit password file hoặc credential. Không bật `BACKUP_RETENTION_DAYS` trước khi đã chạy service thành công và thử
restore một snapshot lấy từ repository off-host; xóa bản local duy nhất không phải chiến lược backup. Xem log bằng
`journalctl -u turborepo-backup.service`; timer dùng `Persistent=true`, nên một lần bị lỡ vì host tắt sẽ chạy sau khi host
khởi động lại.

Backup service chỉ cập nhật `.last-success` sau checkpoint cuối cùng. Health timer đọc file này mỗi giờ và fail khi lần thành
công gần nhất quá `BACKUP_MAX_AGE_HOURS` (mặc định 26 giờ). Hệ thống monitoring của VPS phải cảnh báo khi
`turborepo-backup-health.service` failed; systemd ghi nhận lỗi nhưng tự nó không gửi email hay notification. Kiểm tra thủ công:

```bash
./deploy/compose/scripts/verify-backup-freshness.sh
systemctl status turborepo-backup-health.service --no-pager
```

Compose mount riêng thư mục `backup-status` vào API ở chế độ read-only; tuyệt đối không đổi mount này thành thư mục `backups`
chứa dump. Khi scrape `/metrics`, Prometheus dùng job name `turborepo-api` và nạp `deploy/observability/alerts.yml`. Hai đường
cảnh báo bổ sung cho nhau: systemd phát hiện trực tiếp trên host, còn Prometheus tập trung routing/escalation cùng các alert
API, outbox và queue. Nếu chưa có Prometheus, health timer vẫn có giá trị nhưng phải nối trạng thái failed của unit vào công cụ
monitoring VPS đang dùng.

## 8. Ánh xạ sang AWS

| Contract hiện tại | AWS production target           |
| ----------------- | ------------------------------- |
| Caddy             | Application Load Balancer + ACM |
| API service       | ECS Fargate API service         |
| Worker service    | ECS Fargate worker service      |
| GHCR image        | ECR image                       |
| PostgreSQL volume | RDS PostgreSQL                  |
| Redis volume      | ElastiCache                     |
| `.env.production` | Secrets Manager/Parameter Store |
| local uploads     | S3                              |
| container logs    | CloudWatch Logs                 |

Sự chuyển đổi này thay deployment composition root, không thay domain/application code. Migration trở thành ECS one-off task trước khi update hai ECS service.

## Tự kiểm tra: bạn đã hiểu quy trình chưa?

Bạn đã hiểu deployment contract khi có thể vẽ lại năm ô Caddy, API, worker, PostgreSQL và Redis rồi giải thích đường kết nối giữa chúng. Bạn cũng phải trả lời được vì sao migration chạy trước rollout, vì sao worker không dùng HTTP healthcheck của API và vì sao rollback image không đồng nghĩa rollback database.

Nếu chuẩn bị một VPS, quay lại mục 4 và xác nhận kết quả sau từng bước; đừng copy toàn bộ command trước khi hiểu file environment đang cung cấp secret nào. Trước khi gọi starter là deployable, sang [Chương 16](deployment-readiness.md) để chạy các gate không phụ thuộc nhà cung cấp.
