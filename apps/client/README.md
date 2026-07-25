# Client Web Application

`apps/client` là ứng dụng Next.js dành cho người dùng cuối. Hiện tại ứng dụng mới ở trạng thái scaffold: có App Router root layout, homepage mặc định, Tailwind CSS và font setup; chưa có authentication, business feature, backend integration hoặc test suite.

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

Khi bắt đầu phát triển, giữ App Router là composition layer và tổ chức nghiệp vụ theo feature:

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

App Router render component dưới `app` ở server theo mặc định. Chỉ thêm `"use client"` khi component cần browser API, event handler, local interactive state hoặc client-only library.

```text
Server Component
├── giữ secret ở server
├── fetch dữ liệu gần source
├── giảm JavaScript gửi xuống browser
└── compose Client Component khi cần tương tác
```

Không đánh dấu toàn page hoặc layout là Client Component chỉ vì một nút cần `onClick`. Tách nút hoặc interactive island ra component nhỏ.

## Data access

Chưa có API client. Khi tích hợp backend cần quyết định rõ:

- public/cacheable data có thể fetch trong Server Component;
- user-specific data có thể fetch server-side với cookie/session contract phù hợp;
- realtime hoặc highly interactive data cần client-side state;
- mutation dùng Server Action hay HTTP client phải thống nhất theo security và UX.

Không copy `ApiClient` của Admin vào Client một cách máy móc. Admin là SPA dùng access token memory và refresh token localStorage; Next.js có server runtime và cookie boundary khác.

API endpoint, error mapping và environment validation phải tập trung trong `shared/api` hoặc feature API adapter, không rải raw `fetch` trong UI.

## Authentication mục tiêu

Client chưa có auth. Trước khi triển khai phải thống nhất với backend:

- refresh token có dùng HttpOnly cookie không;
- access token được giữ ở server session hay browser memory;
- CSRF protection;
- CORS và cookie domain;
- middleware chỉ dùng để redirect hay còn kiểm tra authorization;
- server/client rendering sau khi session hết hạn.

Không dùng frontend route protection làm security boundary; backend vẫn authorize request.

## Environment

Environment variable gửi xuống browser phải có prefix `NEXT_PUBLIC_`. Secret không được có prefix này.

Nên tạo một module validation:

```text
shared/config/server-env.ts
shared/config/client-env.ts
```

Không đọc `process.env` rải rác trong feature.

## Error, loading và not-found

Khi có route thật, mỗi route segment cần cân nhắc:

- `loading.tsx` cho streaming/loading UI;
- `error.tsx` cho recoverable render/data error;
- `not-found.tsx` cho resource không tồn tại;
- empty state cho response hợp lệ nhưng không có dữ liệu.

Không hiển thị lỗi network như empty business data.

## Styling và UI

Hiện client chỉ dùng Tailwind. Trước khi thêm nhiều page cần xác định:

- design tokens;
- typography;
- spacing và responsive breakpoints;
- accessible primitives;
- dark mode policy;
- component ownership giữa Client và Admin.

Không chia sẻ trực tiếp Admin UI component nếu hai ứng dụng có product language hoặc dependency khác nhau. Chỉ tách shared UI package khi API của component đã ổn định và có nhu cầu thật ở cả hai app.

## Testing mục tiêu

Khi xuất hiện business behavior, bổ sung:

```text
unit tests              # pure utilities/model
component tests         # interaction và accessibility
integration tests       # route/data/auth boundary
browser E2E             # critical user journey
```

Test nên kiểm tra behavior, không snapshot toàn bộ markup mặc định.

## Lệnh

```bash
pnpm --filter=client dev
pnpm --filter=client lint
pnpm --filter=client build
pnpm --filter=client start
```

`start` dùng production build và mặc định có thể cần truyền port nếu muốn giữ `3005`; script hiện tại chưa pin port cho production start.

## Definition of done cho feature đầu tiên

Feature đầu tiên chỉ được coi là hoàn chỉnh khi:

1. route và ownership rõ;
2. server/client boundary được giải thích;
3. API contract có type và runtime error handling;
4. có loading, error, empty và success state;
5. responsive và keyboard accessible;
6. secret không lọt xuống client bundle;
7. test cho behavior quan trọng;
8. metadata phù hợp;
9. README này được cập nhật nếu kiến trúc thay đổi.
