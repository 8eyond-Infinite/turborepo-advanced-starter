# Đóng góp vào repo này

> **Phụ lục A — Từ một thay đổi local đến pull request**
>
> [Mục lục handbook](docs/README.md) · [Quy chuẩn viết tài liệu](docs/documentation-style-guide.md)

Phụ lục này là checklist cộng tác, không thay thế handbook kiến trúc. Trước khi sửa một bounded context, đọc chương sở hữu context đó; trước khi thay đổi hạ tầng, cập nhật đồng thời chương deployment/operations tương ứng.

Tài liệu này mô tả quy trình làm việc bắt buộc — từ lúc clone đến lúc PR được merge. Đọc một lần trước PR đầu tiên; các quy tắc ở đây đều được máy móc cưỡng chế (hook, CI) nên biết trước sẽ đỡ mất thời gian.

## Bắt đầu

Người mới: đi theo [Lộ trình học từ đầu](docs/getting-started-path.md) trước khi viết code — nó dẫn qua toàn bộ hệ thống kèm bài tập tự kiểm tra. Gặp thuật ngữ lạ thì tra [Bảng thuật ngữ](docs/glossary.md).

Cài môi trường theo mục "Quick start" trong [README.md](README.md).

## Quy trình một thay đổi

1. **Xác định chủ sở hữu của behavior** — app nào, bounded context nào. Đọc handbook tương ứng (bản đồ tài liệu trong README) và tìm test gần nhất trước khi sửa.
2. **Tạo branch từ `main`** — không commit thẳng vào `main`.
3. **Viết code theo quy tắc kiến trúc** — 10 quy tắc trong README mục "Quy tắc kiến trúc"; ESLint và test kiến trúc sẽ chặn phần lớn vi phạm.
4. **Chạy quality gate tại local trước khi push:**

   ```powershell
   pnpm turbo run lint check-types test build
   ```

   Backend E2E cần Docker infrastructure: `docker compose up -d` rồi `pnpm --filter=server test:e2e`.

5. **Mở PR** — CI phải xanh cả ba job (quality, e2e, image) và Security workflow. Coverage của admin không được tụt dưới sàn; phủ thêm test thì nâng sàn trong `apps/admin/vitest.config.ts`.
6. **Cập nhật tài liệu trong cùng PR** nếu thay đổi chạm flow, contract, command, port hoặc cách vận hành — tài liệu mô tả sai code thật bị coi là bug.

`main` được bảo vệ bằng GitHub branch protection. Mọi thay đổi, kể cả của maintainer, phải đi qua pull request và các check bắt buộc: quality/build, Backend E2E, Frontend browser E2E, hai image scan, dependency audit và secret scan. Vercel Preview không phải required check vì starter không sở hữu một API staging public; project sản phẩm chỉ nên đưa Vercel vào required checks sau khi Preview đã có backend staging thật.

Repository chỉ cho **squash merge** và tự xóa branch sau merge. PR title phải là một Conventional Commit hợp lệ vì title đó trở thành commit duy nhất trên `main`. Không bật lại merge commit hoặc rebase merge: release-please có thể nhìn cả PR merge lẫn các `feat:` con và đưa cùng một thay đổi vào release note hai lần.

## Commit message

Commit theo [Conventional Commits](https://www.conventionalcommits.org/) — hook `commit-msg` (commitlint) sẽ chặn message sai định dạng:

```text
<type>(<scope tùy chọn>): <mô tả viết thường, không dấu chấm cuối>

feat(server): add password reset flow
fix(admin): keep table state when pagination changes
docs: explain outbox recovery behaviour
```

`type` thường dùng: `feat`, `fix`, `docs`, `test`, `chore`, `refactor`, `ci`. Lưu ý: subject bắt đầu bằng chữ thường (rule `subject-case`).

Hook `pre-commit` tự format file staged bằng prettier — không cần format tay.

## Những ranh giới không thương lượng

- Secret thật không bao giờ vào git — kể cả trong ví dụ, comment hay file baseline. `.env.example` chỉ chứa placeholder.
- Migration đã merge là lịch sử bất biến — muốn đổi schema thì viết migration mới.
- Thay đổi contract giữa backend và frontend (`@repo/contracts`, `@repo/types`, response shape) phải cập nhật cả hai phía trong cùng PR.
- Tài liệu viết theo [quy ước văn phong](docs/glossary.md#quy-ước-viết-tài-liệu-của-repo): giữ thuật ngữ chuẩn ngành nhưng câu phải mô tả hành động cụ thể bằng tiếng Việt tự nhiên.

## Báo lỗi bảo mật

Không mở public issue — xem [SECURITY.md](SECURITY.md).
