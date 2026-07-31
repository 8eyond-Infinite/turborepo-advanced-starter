# Feature modules

`features/` chứa code theo năng lực nghiệp vụ của Client. `app/` chỉ sở hữu URL, metadata, layout và việc ghép feature vào route; `lib/` chỉ chứa hạ tầng dùng chung không biết nghiệp vụ nào đang gọi nó.

Một feature chỉ tạo những thư mục nó thực sự cần:

```text
features/<feature>/
├── api/          # server-only reads và adapter gọi API
├── actions/      # Server Actions cho mutation
├── components/   # UI thuộc riêng feature
├── validation/   # parse/validate input nghiệp vụ
└── types/        # type nội bộ khi không thuộc shared contract
```

Không tạo barrel `index.ts` mặc định. Route import thẳng file cần dùng để dependency dễ tìm và bundler không vô tình kéo server code qua client boundary. Code chỉ một feature dùng phải ở trong feature đó; code thật sự không biết nghiệp vụ mới được đưa vào `lib/`. Contract dùng chung với backend hoặc Admin thuộc `packages/contracts`, không sao chép vào đây.

Server-only module phải giữ `import "server-only"`. Client Component đặt `"use client"` ở file lá nhỏ nhất cần state/event. Feature không import từ `app/`; chiều phụ thuộc luôn là `app → features → lib/packages`.
