# Storage: upload file qua provider có thể thay thế

Storage cung cấp một capability upload chung cho các feature cần lưu file. Endpoint hiện phục vụ ảnh avatar: chỉ nhận user đã đăng nhập, giới hạn ảnh tối đa 5 MB và trả URL/key để feature Users lưu vào profile.

## Đi theo flow

Browser gửi `multipart/form-data` tới `POST /storage/upload`. `StorageController` xác thực access token, Multer đọc file vào memory, `ParseFilePipe` kiểm tra kích thước và loại file, rồi controller chuyển payload trung lập sang `StoragePort`. Adapter được chọn lúc startup dựa trên `STORAGE_PROVIDER`.

```text
POST /storage/upload
  → JwtAuthGuard
  → multipart parser
  → size/type validation
  → StoragePort
      ├─ LocalStorageAdapter
      └─ S3StorageAdapter
  → { url }
```

`StoragePort` nằm ở application vì object storage là outbound technical dependency, không phải business repository. Controller và feature gọi contract này mà không biết SDK S3 hoặc filesystem path.

## Provider local và S3

`local` phù hợp development và một máy chủ đơn: adapter ghi file vào volume/path cấu hình và Server phục vụ public URL tương ứng. File sẽ mất nếu container bị thay mà không mount persistent volume.

`s3` dùng S3-compatible object storage cho môi trường nhiều instance hoặc cần durability độc lập với VPS. Cần cấu hình bucket, region, endpoint/credentials và public delivery strategy. Production không nên mặc định công khai bucket nếu dữ liệu cần private access; khi đó response contract phải chuyển sang object key hoặc signed URL.

## Bản đồ file

```text
storage/
├── application/ports/storage.port.ts
├── infrastructure/adapters/
│   ├── local-storage.adapter.ts
│   └── s3-storage.adapter.ts
├── presentation/controllers/storage.controller.ts
└── storage.module.ts
```

## Security và giới hạn hiện tại

Kiểm tra extension/MIME ở HTTP boundary giúp loại request sai phổ biến nhưng không thay thế content inspection hoặc malware scan. Dự án có yêu cầu cao phải kiểm tra magic bytes, tạo tên file không tin dữ liệu từ client, giới hạn tổng request body, quét malware và áp lifecycle policy. Upload thành công và cập nhật User là hai request riêng; file orphan có thể tồn tại nếu update profile thất bại, nên dự án thật có thể cần cleanup job.

## Khi mở rộng

Thêm provider mới bằng cách implement `StoragePort` và đăng ký trong `StorageModule`. Nếu feature cần private document, versioning hoặc metadata nghiệp vụ, hãy tạo context/feature sở hữu policy đó; Storage chỉ giữ vai trò technical capability.

## Failure modes

Local volume thiếu permission, disk đầy, S3 credential sai hoặc network timeout đều phải làm upload thất bại. Không trả URL giả. Khi delete được dùng, adapter phải xác định rõ input là URL hay object key và operation có idempotent hay không.

## Tự kiểm tra

Bạn phải giải thích được vì sao port nằm ở application, khi nào local storage không còn phù hợp, và vì sao MIME validation chưa đủ để bảo vệ upload production.
