import { isRouteErrorResponse } from "react-router-dom";

export const getRouteErrorMessage = (error: unknown): string => {
  if (isRouteErrorResponse(error)) {
    return error.status === 404
      ? "Trang bạn yêu cầu không tồn tại."
      : `Không thể mở trang này (HTTP ${error.status}).`;
  }

  return "Trang gặp sự cố khi tải. Hãy thử lại; nếu lỗi tiếp diễn, liên hệ đội vận hành.";
};
