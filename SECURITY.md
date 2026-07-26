# Chính sách bảo mật (Security Policy)

_English summary: please report vulnerabilities privately to the email below; do not open a public issue. We aim to acknowledge reports within 72 hours._

## Phiên bản được hỗ trợ

Chỉ nhánh `main` được vá bảo mật. Image đã publish trên GHCR gắn tag theo commit SHA — bản vá đồng nghĩa với một image mới, không sửa image cũ.

## Báo cáo lỗ hổng

- **KHÔNG** mở public issue cho lỗ hổng bảo mật — issue công khai là công bố lỗ hổng trước khi có bản vá.
- Gửi email tới **trananhtu1112003@gmail.com** với tiêu đề bắt đầu bằng `[SECURITY]`, kèm: mô tả lỗ hổng, các bước tái hiện, phạm vi ảnh hưởng ước tính, và bản vá đề xuất nếu có.
- Chúng tôi xác nhận đã nhận báo cáo trong vòng 72 giờ và trao đổi tiến độ xử lý qua email.

## Phạm vi

Trong phạm vi: code trong repo này (server, admin, client, packages), workflow CI, Dockerfile. Ngoài phạm vi: lỗ hổng của dependency đã có advisory công khai (được xử lý qua Dependabot/pnpm audit), và cấu hình hạ tầng triển khai của từng người dùng repo.

## Các lớp phòng thủ đang có

Để người báo cáo đối chiếu nhanh: refresh token nằm trong HttpOnly cookie; access token thu hồi tức thời qua `tokenVersion`; rate limiting trên nhóm `/auth`; helmet; CORS allowlist (HTTP và Socket.IO dùng chung); secret scan (gitleaks) và audit dependency chạy trên mỗi commit; image được quét trivy trước khi publish. Chi tiết trong [docs/architecture.md](docs/architecture.md).
