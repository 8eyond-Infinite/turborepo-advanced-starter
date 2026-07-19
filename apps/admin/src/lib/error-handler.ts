import { ApiError } from './api-client';

/**
 * Enterprise Centralized Error Handler
 * Maps backend domain exceptions or generic HTTP status codes to localized friendly messages.
 */
export function getFriendlyErrorMessage(err: unknown): string {
    if (err instanceof ApiError) {
        // 1. Map by specific backend domain exception code (Preferred)
        if (err.code) {
            switch (err.code) {
                case 'InvalidCredentialsException':
                    return 'Tài khoản hoặc mật khẩu không chính xác.';
                case 'UserDeactivatedException':
                    return 'Tài khoản của bạn đã bị khóa hoặc vô hiệu hóa.';
                case 'ForbiddenException':
                    return 'Bạn không có quyền thực hiện hành động này.';
                default:
                    return err.message;
            }
        }

        // 2. Fallback to generic HTTP status code mapping
        switch (err.status) {
            case 401:
                return 'Phiên đăng nhập hết hạn hoặc thông tin xác thực sai.';
            case 403:
                return 'Bạn bị từ chối truy cập vào tài nguyên này.';
            case 404:
                return 'Không tìm thấy tài nguyên yêu cầu.';
            case 500:
                return 'Lỗi máy chủ hệ thống. Vui lòng liên hệ quản trị viên.';
            default:
                return err.message;
        }
    }

    if (err instanceof Error) {
        // Generic browser/JavaScript errors (e.g. Network offline)
        if (err.message.includes('Failed to fetch')) {
            return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng.';
        }
        return err.message;
    }

    return 'Đã xảy ra lỗi không xác định.';
}
