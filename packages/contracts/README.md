# `@repo/contracts`: hợp đồng hành vi dùng chung

Package này chứa những khái niệm mà nhiều application hoặc process phải hiểu giống nhau: permission, principal công khai, mã lỗi và envelope/payload của integration hoặc realtime event. Đây là protocol ổn định giữa các bên, không phải nơi gom mọi TypeScript interface.

Một type nên vào đây khi thay đổi của nó có thể làm bên gửi và bên nhận không còn giao tiếp được. Domain entity, Prisma model, repository port, backend exception class và raw JWT signing payload phải ở trong Server. UI state và kiểu chỉ phục vụ một feature phải ở application sở hữu feature đó.

`src/index.ts` là public API duy nhất. Consumer import từ `@repo/contracts`, không import xuyên vào file nội bộ. Khi thêm contract, hãy export có chủ đích qua file này và kiểm tra compatibility của các consumer.
