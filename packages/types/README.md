# `@repo/types`: read model có thể chia sẻ

Package này chứa các data shape dạng JSON mà Server, Admin và Client cùng đọc, ví dụ `User`, `Role`, `Notification`, `AuditLog` và pagination metadata. Chúng mô tả dữ liệu trả về để render hoặc truyền qua API; chúng không chứa hành vi nghiệp vụ.

Một type phù hợp khi nó là read model ổn định, có thể serialize và thực sự có từ hai workspace trở lên cùng dùng. Command, event protocol, error contract và permission thuộc `@repo/contracts`. Form state hoặc kiểu chỉ dùng trong một feature nên đặt cạnh feature. Domain entity và persistence model ở lại bounded context sở hữu chúng.

`src/index.ts` là public API duy nhất. Nếu package bắt đầu tích tụ các type không liên quan chỉ vì “dùng chung”, đó là tín hiệu phải trả type về owner thay vì tiếp tục mở rộng package.
