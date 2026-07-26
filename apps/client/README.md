# Client Web Application

`apps/client` là ứng dụng Next.js dành cho người dùng cuối. Hiện tại ứng dụng mới ở trạng thái scaffold: có App Router root layout, homepage mặc định, Tailwind CSS và font setup; chưa có đăng nhập, chưa có tính năng nghiệp vụ, chưa nối với backend và cũng chưa có bộ test.

Tài liệu này mô tả đúng trạng thái đó và đặt ra cấu trúc mục tiêu để code mới không phát triển tự phát.

## Runtime hiện tại

| Thành phần          | Giá trị                         |
| ------------------- | ------------------------------- |
| Framework           | Next.js 16 App Router           |
| React               | React 19                        |
| Styling             | Tailwind CSS 4                  |
| Dev port            | `3005`                          |
| Rendering           | React Server Component mặc định |
| Backend integration | Chưa có                         |
| Authentication      | Chưa có                         |
| Test runner         | Chưa có                         |

Chạy riêng client từ root:

```bash
pnpm dev:client
```

Hoặc:

```bash
pnpm --filter=client dev
```

Mở `http://localhost:3005`.

## Cấu trúc hiện tại

```text
apps/client/
├── app/
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── public/
├── eslint.config.mjs
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
└── package.json
```

### `app/layout.tsx`

Root layout khai báo metadata, nạp Geist fonts và global CSS. File đang dùng metadata mặc định `Create Next App`; cần thay khi bắt đầu sản phẩm.

### `app/page.tsx`

Homepage hiện là UI mặc định của Next.js. Không có business behavior để tài liệu hóa.

### `app/globals.css`

Nạp Tailwind và định nghĩa color/font variables tối thiểu.

## Kiến trúc mục tiêu

Khi bắt đầu phát triển, hãy để thư mục `app` của App Router chỉ làm nhiệm vụ ghép trang từ các mảnh có sẵn (composition layer), còn code nghiệp vụ tổ chức theo feature:

```text
apps/client/
├── app/
│   ├── (public)/
│   ├── (authenticated)/
│   ├── api/                    # chỉ khi cần route handler/BFF endpoint
│   ├── error.tsx
│   ├── loading.tsx
│   ├── layout.tsx
│   └── page.tsx
├── features/
│   └── account/
│       ├── api/
│       ├── components/
│       ├── model/
│       └── index.ts
├── shared/
│   ├── api/
│   ├── config/
│   ├── errors/
│   ├── ui/
│   └── utils/
└── public/
```

Đây là hướng dẫn mục tiêu, không phải cây thư mục đang tồn tại.

## Server và Client Components

App Router render component dưới `app` ở server theo mặc định. Chỉ thêm `"use client"` khi component thật sự cần: gọi API của trình duyệt, bắt sự kiện người dùng, giữ trạng thái tương tác cục bộ, hoặc dùng thư viện chỉ chạy được phía client.

```text
Server Component
├── giữ secret ở server
├── fetch dữ liệu gần source
├── giảm JavaScript gửi xuống browser
└── compose Client Component khi cần tương tác
```

Không đánh dấu toàn page hoặc layout là Client Component chỉ vì một nút cần `onClick`. Hãy tách riêng nút đó — một "đảo tương tác" nhỏ — thành component con.

## Data access

Chưa có API client. Khi tích hợp backend cần quyết định rõ:

- dữ liệu công khai, cache được thì có thể fetch ngay trong Server Component;
- dữ liệu riêng của từng người dùng có thể fetch ở phía server, kèm thỏa thuận rõ ràng về cookie/session;
- dữ liệu realtime hoặc tương tác liên tục thì cần giữ state ở phía client;
- việc ghi dữ liệu (mutation) dùng Server Action hay HTTP client phải được thống nhất dựa trên yêu cầu bảo mật và trải nghiệm người dùng.

Không copy `ApiClient` của Admin vào Client một cách máy móc. Admin là SPA giữ access token trong bộ nhớ và refresh token trong localStorage; còn Next.js chạy thêm phần server nên cách gửi và giữ cookie hoàn toàn khác.

Địa chỉ endpoint, việc dịch lỗi và việc kiểm tra biến môi trường phải tập trung trong `shared/api` hoặc API adapter của feature; không gọi `fetch` thô rải rác trong code UI.

## Authentication mục tiêu

Client chưa có auth. Trước khi triển khai phải thống nhất với backend:

- refresh token có dùng HttpOnly cookie không;
- access token được giữ ở server session hay browser memory;
- cách chống tấn công CSRF;
- cấu hình CORS và domain đặt cookie;
- middleware chỉ dùng để chuyển hướng hay còn kiểm tra quyền truy cập;
- khi phiên đăng nhập hết hạn thì server và client render trang thế nào.

Không coi việc chặn route ở frontend là hàng rào bảo mật; backend vẫn phải kiểm tra quyền cho từng request.

## Environment

Environment variable gửi xuống browser phải có prefix `NEXT_PUBLIC_`. Secret không được có prefix này.

Nên tạo một module tập trung để đọc và kiểm tra biến môi trường:

```text
shared/config/server-env.ts
shared/config/client-env.ts
```

Không đọc `process.env` rải rác trong feature.

## Error, loading và not-found

Khi có route thật, mỗi route segment cần cân nhắc:

- `loading.tsx` cho giao diện chờ khi trang đang tải dần (streaming);
- `error.tsx` cho lỗi render hoặc lỗi dữ liệu mà người dùng có thể thử lại;
- `not-found.tsx` cho tài nguyên không tồn tại;
- empty state cho response hợp lệ nhưng không có dữ liệu.

Không hiển thị lỗi mạng như thể dữ liệu nghiệp vụ đang rỗng.

## Styling và UI

Hiện client chỉ dùng Tailwind. Trước khi thêm nhiều page cần xác định:

- design token (bộ giá trị màu, cỡ chữ, khoảng cách dùng thống nhất toàn app);
- quy tắc trình bày chữ (typography);
- khoảng cách và các mốc responsive;
- các component cơ bản đạt chuẩn hỗ trợ tiếp cận (accessible);
- chính sách dark mode;
- component nào thuộc về Client, component nào thuộc về Admin.

Không dùng chung trực tiếp UI component của Admin nếu hai ứng dụng khác nhau về ngôn ngữ sản phẩm (cách đặt tên, cách trình bày) hoặc dependency. Chỉ tách package UI dùng chung khi API của component đã ổn định và cả hai app thật sự cần.

## Testing mục tiêu

Khi xuất hiện business behavior, bổ sung:

```text
unit tests              # pure utilities/model
component tests         # interaction và accessibility
integration tests       # route/data/auth boundary
browser E2E             # critical user journey
```

Test nên kiểm tra hành vi mà người dùng nhìn thấy, không chụp snapshot toàn bộ markup mặc định.

## Lệnh

```bash
pnpm --filter=client dev
pnpm --filter=client lint
pnpm --filter=client build
pnpm --filter=client start
```

`start` chạy bản production build; nếu muốn giữ port `3005` thì phải tự truyền port, vì script hiện tại chưa cố định port cho chế độ production.

## Definition of done cho feature đầu tiên

Feature đầu tiên chỉ được coi là hoàn chỉnh khi:

1. route rõ ràng và biết feature nào sở hữu nó;
2. giải thích được phần nào render ở server, phần nào ở client;
3. hợp đồng API có type đầy đủ và có xử lý lỗi lúc chạy;
4. có đủ trạng thái loading, error, empty và success;
5. hiển thị tốt trên mọi cỡ màn hình và dùng được bằng bàn phím;
6. secret không lọt xuống client bundle;
7. có test cho các hành vi quan trọng;
8. metadata phù hợp;
9. README này được cập nhật nếu kiến trúc thay đổi.
