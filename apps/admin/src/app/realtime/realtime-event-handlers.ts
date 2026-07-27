import type { QueryClient } from "@tanstack/react-query";
import type { Socket } from "socket.io-client";
import { toast } from "sonner";
import { notificationKeys } from "@/features/notifications";

interface NotificationReceived {
  id: string;
  title: string;
  content: string;
  type?: string;
}

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

  const handleNotificationReceived = (data: NotificationReceived) => {
    showNotification(
      `${data.title}: ${data.content}`,
      (data.type || "info").toLowerCase(),
    );
    void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  };

  const handleNotification = (data: NotificationMessage) => {
    showNotification(data.message, data.type);
  };

  socket.on("force_logout", handleForceLogout);
  socket.on("notification_received", handleNotificationReceived);
  socket.on("notification", handleNotification);

  return () => {
    socket.off("force_logout", handleForceLogout);
    socket.off("notification_received", handleNotificationReceived);
    socket.off("notification", handleNotification);
  };
};
