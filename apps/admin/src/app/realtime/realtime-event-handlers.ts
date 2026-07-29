import type { QueryClient } from "@tanstack/react-query";
import type { Socket } from "socket.io-client";
import { toast } from "sonner";
import { notificationKeys } from "@/features/notifications";
import { reportError } from "@/lib/observability";
import {
  REALTIME_AUTH_ERROR_CODE,
  REALTIME_EVENTS,
  type NotificationReceivedEvent,
} from "@repo/contracts";

interface NotificationMessage {
  message: string;
  type?: "info" | "success" | "warning" | "error";
}

const showNotification = (message: string, type = "info") => {
  if (type === "success") toast.success(message);
  else if (type === "error" || type === "danger") toast.error(message);
  else if (type === "warning") toast.warning(message);
  else toast.info(message);
};

export const registerRealtimeEventHandlers = ({
  socket,
  queryClient,
  logout,
}: {
  socket: Socket;
  queryClient: QueryClient;
  logout: () => Promise<void>;
}): (() => void) => {
  const handleForceLogout = (data: { message?: string }) => {
    toast.error(
      data.message ||
        "Tài khoản của bạn đã bị khóa hoặc thu hồi quyền truy cập.",
      { duration: 5000 },
    );
    void logout();
  };

  const handleNotificationReceived = (data: NotificationReceivedEvent) => {
    showNotification(
      `${data.title}: ${data.content}`,
      (data.type || "info").toLowerCase(),
    );
    void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  };

  const handleNotification = (data: NotificationMessage) => {
    showNotification(data.message, data.type);
  };

  const handleConnectError = (error: Error) => {
    const code = (
      error as Error & {
        data?: { code?: unknown };
      }
    ).data?.code;

    if (code === REALTIME_AUTH_ERROR_CODE) {
      toast.error("Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.", {
        duration: 5000,
      });
      void logout();
      return;
    }

    reportError(error, {
      source: "realtime",
      route: window.location.pathname,
      operation: "connect",
    });
  };

  socket.on("connect_error", handleConnectError);
  socket.on(REALTIME_EVENTS.FORCE_LOGOUT, handleForceLogout);
  socket.on(REALTIME_EVENTS.NOTIFICATION_RECEIVED, handleNotificationReceived);
  socket.on(REALTIME_EVENTS.NOTIFICATION, handleNotification);

  return () => {
    socket.off("connect_error", handleConnectError);
    socket.off(REALTIME_EVENTS.FORCE_LOGOUT, handleForceLogout);
    socket.off(
      REALTIME_EVENTS.NOTIFICATION_RECEIVED,
      handleNotificationReceived,
    );
    socket.off(REALTIME_EVENTS.NOTIFICATION, handleNotification);
  };
};
