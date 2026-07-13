import { execSync } from 'child_process';

module.exports = async () => {
    console.log('\n[Global Setup] Đang đồng bộ cấu trúc bảng sang DB Test...');
    const dbTestUrl = process.env.DATABASE_URL;

    if (!dbTestUrl) {
        throw new Error('Không tìm thấy DATABASE_URL trong môi trường kiểm thử (.env.test)!');
    }

    try {
        execSync(
            `npx prisma db push --schema=../../packages/database/prisma/schema.prisma --url="${dbTestUrl}" --accept-data-loss`,
            { stdio: 'inherit' }
        );
        execSync(
            `npx tsx ../../packages/database/prisma/seed.ts`,
            {
                stdio: 'inherit',
                env: { ...process.env, DATABASE_URL: dbTestUrl }
            }
        );
        console.log('[Global Setup] Đồng bộ và seed DB Test hoàn tất. Bắt đầu chạy các chuỗi kiểm thử...\n');
    } catch (error) {
        console.error('[Global Setup] Thất bại khi đồng bộ dữ liệu sang DB Test:', error);
        throw error;
    }
};