import { ApiError } from './api-client';
import i18n from 'i18next';

/**
 * Enterprise Centralized Error Handler
 * Maps backend domain exceptions or generic HTTP status codes to localized friendly messages.
 */
export function getFriendlyErrorMessage(err: unknown): string {
    if (err instanceof ApiError) {
        // 1. Map by translationKey returned from Backend (Preferred)
        if (err.translationKey) {
            return i18n.t(err.translationKey, { ...err.args, defaultValue: err.message });
        }

        // 2. Fallback: Map by legacy exception code if translationKey is missing
        if (err.code) {
            // Converts USER_DEACTIVATED -> exceptions.user.deactivated
            const legacyKey = `exceptions.${err.code.toLowerCase().replace(/_(\w)/g, (_, c) => '.' + c)}`;
            if (i18n.exists(legacyKey)) {
                return i18n.t(legacyKey, { ...err.args, defaultValue: err.message });
            }
        }

        // 3. Fallback to generic HTTP status code mapping
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
            return i18n.t('errors.network_failure', { defaultValue: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng.' });
        }
        return err.message;
    }

    return 'Đã xảy ra lỗi không xác định.';
}
