# Lộ trình học repo từ đầu

> **Phần I · Chương 2 — Học hệ thống bằng cách chạy nó**
>
> Chương trước: [Repository nhìn từ bên ngoài](../README.md) · [Mục lục handbook](README.md) · Chương sau: [Ngôn ngữ chung](glossary.md)

Ta chưa cố học thuộc cấu trúc thư mục. Ta sẽ làm hệ thống chạy, tạo một request thật rồi đi theo dấu vết mà request để lại. Câu chuyện xuyên suốt là một quản trị viên đăng nhập, đọc danh sách user, tạo user mới và quan sát email nền.

Mỗi chặng chỉ giới thiệu khái niệm đúng lúc nó xuất hiện. Khi gặp từ lạ, mở [glossary](glossary.md), đọc định nghĩa rồi quay lại; không cần học thuộc glossary trước. Một cách hiểu chỉ đáng tin khi bạn dự đoán được hệ thống sẽ làm gì rồi tự quan sát thấy đúng điều đó.

Tài liệu này dành cho người **mới vào repo, chưa biết gì về hệ thống**. Đi theo đúng thứ tự. Mỗi bước nói rõ:

1. Bạn sắp tìm hiểu điều gì.
2. Bạn cần chạy hoặc mở thứ gì.
3. Kết quả đúng trông như thế nào.
4. Bạn phải giải thích lại được điều gì trước khi đi tiếp.

Chuẩn bị trước: mở sẵn [Bảng thuật ngữ](glossary.md) ở tab bên cạnh để tra từ lạ, và [Thư viện dùng để làm gì](tech-stack.md) khi muốn biết một dependency có mặt trong repo để giải quyết chuyện gì.

Tổng thời gian tham khảo: 1–2 ngày làm việc nếu đã biết TypeScript.

---

## Bước 0 — Chạy được hệ thống trên máy mình

**Mục tiêu:** mọi service chạy, đăng nhập được vào Admin. Chưa cần hiểu gì cả.

**Đọc:** [README.md](../README.md) mục "Quick start chuẩn trên Windows".

**Làm:**

```powershell
corepack enable
pnpm bootstrap   # tạo .env, khởi động Docker, cài dependency, migrate, seed
pnpm dev
```

`pnpm bootstrap` tự làm mọi bước chuẩn bị và in ra tài khoản admin ở cuối. Muốn biết bên trong nó làm những gì (và tự tay làm lại từng bước), xem mục "Làm từng bước bằng tay" trong README — hiểu được từng bước đó chính là một phần của lộ trình học.

Mở `http://localhost:5173`, đăng nhập bằng `admin@example.com` + mật khẩu mà bootstrap in ra (được lưu ở dòng `SEED_ADMIN_PASSWORD` trong `.env` root).

**Tự kiểm tra:**

- [ ] Swagger mở được ở `http://localhost:3001/api`?
- [ ] Vì sao phải chạy `db:generate` trước `pnpm dev`? (gợi ý: Prisma Client là code được sinh ra)
- [ ] Postgres đang chạy ở port nào trên máy bạn, và vì sao không phải 5432? (xem bảng port trong README)

---

## Bước 1 — Hiểu monorepo và task graph

**Mục tiêu:** biết cái gì nằm ở đâu và lệnh mình gõ thực ra chạy những gì.

**Đọc:** [README.md](../README.md) mục "Thành phần trong monorepo"; [glossary.md](glossary.md) nhóm A; file [turbo.json](../turbo.json).

**Làm:**

```powershell
pnpm turbo run lint
```

Nhìn output: turbo build `@repo/contracts`, `@repo/types`, `@repo/database` **trước** khi lint `server` — đó là task graph đang hoạt động.

**Tự kiểm tra:**

- [ ] `@repo/contracts` khác gì `@repo/types`? (một bên là hằng số/contract dùng chung như permission, một bên là kiểu dữ liệu wire cho frontend)
- [ ] Nếu sửa một file trong `packages/contracts` rồi chạy lại `pnpm turbo run lint`, những task nào bị chạy lại, task nào ăn cache?

---

## Bước 2 — Cách hình dung backend

**Mục tiêu:** nhìn một thư mục bất kỳ trong `apps/server/src/contexts/` và biết mình đang đứng ở tầng nào.

**Đọc:** [apps/server/README.md](../apps/server/README.md) mục 1–5; [glossary.md](glossary.md) nhóm B.

**Làm:** mở `apps/server/src/contexts/iam/users/` và đối chiếu 4 thư mục con với 4 tầng vừa đọc. Sau đó chạy:

```powershell
pnpm --filter=server test -- --testPathPattern=dependency-rules
```

Đây là bài test "gác cổng kiến trúc": nó grep toàn bộ code domain và fail nếu domain import framework.

**Tự kiểm tra:**

- [ ] `UserEntity` nằm ở tầng nào? `PrismaUserRepository` nằm ở tầng nào? Cái nào biết cái nào?
- [ ] Vì sao `user.entity.ts` không được phép `import { PrismaClient }`?
- [ ] Port và adapter — trong cặp `UserRepository` / `PrismaUserRepository`, cái nào là port?

---

## Bước 3 — Đi theo một READ flow với dữ liệu thật

**Mục tiêu:** tự tay bắn request, nhận response, và chỉ ra được từng dòng code đã xử lý nó.

**Đọc:** [apps/server/README.md](../apps/server/README.md) mục 6 (có sẵn curl + JSON mẫu để đối chiếu).

**Làm:** đăng nhập lấy token rồi gọi danh sách user:

```bash
curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"<SEED_ADMIN_PASSWORD của bạn>"}'
# → {"accessToken":"eyJ...","refreshToken":"eyJ..."}

curl -s "http://localhost:3001/users?page=1&limit=2" \
  -H "Authorization: Bearer <accessToken vừa nhận>"
```

Giờ mở code và lần theo response đó qua đúng thứ tự: `user.controller.ts` → `get-users.query.ts` → `get-users.handler.ts` → `prisma-user.repository.ts` → `user.presenter.ts`.

**Tự kiểm tra:**

- [ ] Response user KHÔNG có field `password` và `tokenVersion` — dòng code nào quyết định điều đó?
- [ ] Nếu gọi `/users?sortBy=password` thì điều gì chặn nó? (gợi ý: `@IsIn(USER_SORT_FIELDS)` trong DTO)
- [ ] Response header có `x-correlation-id` — ai sinh ra nó?

---

## Bước 4 — Đi theo một WRITE flow và nhìn outbox chạy

**Mục tiêu:** hiểu vì sao "lưu user" và "phát event" không bao giờ lệch nhau — trái tim của kiến trúc này.

**Đọc:** [apps/server/README.md](../apps/server/README.md) mục 7–8; [glossary.md](glossary.md) nhóm C.

**Làm:** đăng ký một user mới rồi nhìn hậu trường:

```bash
curl -s -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"hocvien@example.com","username":"hocvien","password":"matkhau123"}'
```

Trong vòng ~1 giây, lần lượt kiểm tra 3 dấu vết:

```powershell
# 1. Event đã được ghi và phát chưa?
docker exec starter-postgres psql -U postgres -d starter_db -c "SELECT type, status, attempts FROM outbox_events ORDER BY occurred_at DESC LIMIT 3;"

# 2. Mail chào mừng đã tới Maildev chưa? Mở http://localhost:1083

# 3. Log server: tìm dòng xử lý send-welcome-email
```

**Tự kiểm tra:**

- [ ] Row trong `outbox_events` chuyển từ status nào sang status nào? Ai chuyển nó?
- [ ] Nếu server crash ngay SAU khi commit transaction nhưng TRƯỚC khi gửi mail — mail có bị mất không? Vì sao không?
- [ ] Vì sao gửi mail nằm trong BullMQ worker chứ không nằm ngay trong `RegisterHandler`?

---

## Bước 5 — Auth: vòng đời của một phiên đăng nhập

**Mục tiêu:** giải thích được access token, refresh token, JTI, rotation và tokenVersion bằng lời của mình.

**Đọc:** [Auth context README](../apps/server/src/contexts/iam/auth/README.md) — đặc biệt 2 sequence diagram ở mục 4 và 6; [glossary.md](glossary.md) nhóm D.

**Làm:** thí nghiệm rotation bằng chính curl:

```bash
# 1. Login, giữ lại refreshToken (gọi là R1)
# 2. Refresh bằng R1 → nhận cặp token mới (R2)
curl -s -X POST http://localhost:3001/auth/refresh -H "Authorization: Bearer <R1>"
# 3. Thử refresh bằng R1 lần nữa → phải bị 401, vì R1 đã bị rotation hủy
curl -s -X POST http://localhost:3001/auth/refresh -H "Authorization: Bearer <R1>"
```

**Tự kiểm tra:**

- [ ] Refresh token bị đánh cắp nguy hiểm trong bao lâu? Cơ chế nào giới hạn nó?
- [ ] `logout/global` làm gì mà access token cũ chết NGAY LẬP TỨC thay vì đợi 15 phút? (gợi ý: tokenVersion)
- [ ] Redis lưu key hình dạng gì cho mỗi phiên? Xóa một key đó tương đương hành động gì trên UI Admin?

---

## Bước 6 — Admin frontend: từ click đến cache

**Mục tiêu:** hiểu đường đi của dữ liệu trong admin: component → hook → api adapter → ApiClient → backend, và cache nằm ở đâu.

**Đọc:** [apps/admin/README.md](../apps/admin/README.md) mục 2, 5, 6, 7; [glossary.md](glossary.md) nhóm E.

**Làm:** mở Admin với DevTools (tab Network):

1. Vào trang Users, đổi trang/pagination — quan sát query key thay đổi kéo theo request mới.
2. Để access token hết hạn (đợi 15 phút hoặc sửa tạm TTL), bấm một thao tác bất kỳ — quan sát: request 401 → một request `/auth/refresh` duy nhất → request cũ được bắn lại thành công. Đó là single-flight refresh.
3. Tạo một user mới — quan sát danh sách tự refetch (invalidation theo `userKeys.all`).

**Tự kiểm tra:**

- [ ] Access token của admin được lưu ở đâu? Refresh token lưu ở đâu và vì sao JavaScript không đọc được nó? (gợi ý: mở DevTools → Application → Cookies, để ý cột HttpOnly)
- [ ] Vì sao component không được gọi `fetch` trực tiếp mà phải qua api adapter của feature?
- [ ] Nút "Xóa user" biến mất với tài khoản thiếu quyền — đó có phải là bảo mật không? Chốt chặn thật nằm ở đâu?

---

## Bước 7 — Tự thêm một feature hoàn chỉnh

**Mục tiêu:** làm được một lát cắt dọc từ backend đến admin theo đúng chuẩn repo.

**Đọc:** [apps/admin/README.md](../apps/admin/README.md) mục 10 (mini-tutorial có code mẫu); [Auth context README](../apps/server/src/contexts/iam/auth/README.md) mục 11 "Cách mở rộng".

**Làm (bài tập tốt nghiệp):** thêm feature `projects` tối giản — backend: model + migration, context mới với 1 command `CreateProject` + 1 query `GetProjects`, permission `project:create`/`project:read` trong `@repo/contracts`, seed permission; admin: feature slice `projects` theo đúng 4 file chuẩn. Chốt bằng:

```powershell
pnpm turbo run lint check-types test build
```

**Tự kiểm tra:**

- [ ] Quality gate xanh toàn bộ?
- [ ] Feature admin của bạn có vượt qua được ESLint rule chặn deep-import giữa các feature không?
- [ ] Bạn có phải sửa file nào NGOÀI context/feature của mình không — nếu có, file nào là hợp lệ (contracts, route registry, seed) và file nào là dấu hiệu vi phạm ranh giới?

---

## Sau lộ trình này

- Đọc [architecture.md](architecture.md) một lượt từ đầu — giờ bạn đã có đủ nền để hiểu các quyết định và trade-off trong đó.
- Đọc [development-and-deployment.md](development-and-deployment.md) khi cần làm việc với Docker, CI, migration cho môi trường thật.
- Khi đã chọn application hoặc bounded context để làm việc, đọc phần giới hạn, anti-pattern và checklist review ở cuối handbook tương ứng. Chọn một giới hạn có test bảo vệ để cải thiện là cách học sâu nhất.
