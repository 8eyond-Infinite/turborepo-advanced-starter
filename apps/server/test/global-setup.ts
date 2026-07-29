import { execSync } from 'child_process';

module.exports = async () => {
  console.log('\n[Global Setup] Đang đồng bộ cấu trúc bảng sang DB Test...');
  const dbTestUrl = process.env.DATABASE_URL;

  if (!dbTestUrl) {
    throw new Error(
      'Không tìm thấy DATABASE_URL trong môi trường kiểm thử (.env.test)!',
    );
  }

  const databaseName = new URL(dbTestUrl).pathname.replace(/^\//, '');
  if (!databaseName.endsWith('_test')) {
    throw new Error(
      `Từ chối reset database "${databaseName}". DATABASE_URL của E2E phải trỏ tới database có hậu tố "_test".`,
    );
  }

  try {
    execSync(
      `pnpm --dir ../../packages/database exec prisma db push --schema=prisma/schema.prisma --url="${dbTestUrl}" --force-reset`,
      { stdio: 'inherit' },
    );
    execSync(`pnpm --dir ../../packages/database db:seed`, {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: dbTestUrl },
    });
    console.log(
      '[Global Setup] Đồng bộ và seed DB Test hoàn tất. Bắt đầu chạy các chuỗi kiểm thử...\n',
    );
  } catch (error) {
    console.error(
      '[Global Setup] Thất bại khi đồng bộ dữ liệu sang DB Test:',
      error,
    );
    throw error;
  }
};
