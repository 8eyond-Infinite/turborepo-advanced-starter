# Triển khai backend không phụ thuộc nhà cung cấp

Tài liệu này mô tả deployment contract chung của backend và cách diễn tập nó trên một máy Ubuntu/WSL2 trước khi đưa lên VPS hoặc chuyển sang AWS ECS. Render, một VPS và ECS là ba cách hiện thực khác nhau của cùng contract; application image, process boundary và thứ tự migration không thay đổi theo nhà cung cấp.

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

Sao chép file mẫu nhưng không commit file thật:

```powershell
Copy-Item deploy/compose/.env.production.example deploy/compose/.env.production
```

Điền các nhóm biến:

- `SERVER_IMAGE` và `SERVER_IMAGE_TAG` nhận diện artifact;
- `POSTGRES_*`, `DATABASE_URL`, `REDIS_PASSWORD` là datastore credential;
- hai JWT secret độc lập, tối thiểu 32 ký tự;
- `CORS_ORIGINS` là exact browser origins, không có slash cuối;
- `API_ADDRESS=http://localhost` cho diễn tập local;
- SMTP và storage provider theo môi trường.

`POSTGRES_PASSWORD` xuất hiện cả ở bootstrap database lẫn `DATABASE_URL`; hai giá trị phải khớp. Dùng secret URL-safe để tránh encode sai connection URL. Sinh secret bằng:

```bash
openssl rand -hex 32
```

Với local image:

```powershell
$compose = "deploy/compose/compose.production.yaml"
$envFile = "deploy/compose/.env.production"

# Trong .env.production đặt SERVER_IMAGE=turborepo-starter/server
# và SERVER_IMAGE_TAG=local cho riêng bài diễn tập local.
docker compose --env-file $envFile -f $compose config --quiet
docker compose --env-file $envFile -f $compose build api
docker compose --env-file $envFile -f $compose up -d --wait postgres redis
docker compose --env-file $envFile -f $compose run --rm migrate
docker compose --env-file $envFile -f $compose up -d api worker caddy
docker compose --env-file $envFile -f $compose up --wait api
```

Bootstrap admin chỉ chạy lần đầu:

```powershell
# Tạm đặt ALLOW_PRODUCTION_SEED=true và điền SEED_ADMIN_*.
docker compose --env-file $envFile -f $compose --profile tools run --rm seed
```

Sau khi seed thành công, đổi `ALLOW_PRODUCTION_SEED=false` và xóa mật khẩu bootstrap khỏi file nếu không còn cần. Seed không đổi mật khẩu của admin đã tồn tại.

Kiểm tra:

```powershell
curl.exe http://localhost/health/live
curl.exe http://localhost/health/ready
docker compose --env-file $envFile -f $compose ps
docker compose --env-file $envFile -f $compose logs --tail 100 api worker caddy
```

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
