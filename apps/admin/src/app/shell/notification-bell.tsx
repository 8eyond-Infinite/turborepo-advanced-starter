import { useId } from "react";
import { useNotifications } from "@/features/notifications";
import { Bell, CheckCheck } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { getFriendlyErrorMessage } from "@/lib/error-handler";
import { NotificationItemButton } from "./NotificationItemButton";

export const NotificationBell = () => {
  const unreadDescriptionId = useId();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
    isMarkingAllAsRead,
    isMarkingNotification,
    markingNotificationId,
  } = useNotifications();

  const handleMarkAllAsRead = () => {
    void markAllAsRead().catch(() => undefined);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full cursor-pointer"
          aria-label="Mở danh sách thông báo"
          aria-describedby={unreadDescriptionId}
          title="Thông báo"
        >
          <Bell className="w-5 h-5" />
          <span id={unreadDescriptionId} className="sr-only">
            {unreadCount} thông báo chưa đọc
          </span>
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute top-1.5 right-1.5 w-4 h-4 bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center rounded-full animate-pulse"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        aria-labelledby="notification-popover-title"
        className="w-80 p-0 max-h-[480px] bg-popover text-popover-foreground border-border rounded-xl shadow-xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <h4
            id="notification-popover-title"
            className="font-bold text-sm text-foreground"
          >
            Thông báo
          </h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              disabled={isMarkingAllAsRead || isMarkingNotification}
              onClick={handleMarkAllAsRead}
              className="h-auto p-0 text-xs text-primary hover:text-primary/80 hover:bg-transparent flex items-center gap-1 font-semibold transition-colors duration-200 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              {isMarkingAllAsRead ? "Đang cập nhật..." : "Đọc tất cả"}
            </Button>
          )}
        </div>

        {/* Notification List */}
        <div className="overflow-y-auto flex-1 divide-y divide-border max-h-[360px] custom-scrollbar">
          {isLoading ? (
            <div
              className="p-8 text-center text-sm text-muted-foreground"
              role="status"
              aria-label="Đang tải thông báo"
            >
              Đang tải thông báo...
            </div>
          ) : isError ? (
            <div className="space-y-3 p-6 text-center" role="alert">
              <p className="text-sm font-medium">Không thể tải thông báo</p>
              <p className="text-xs text-muted-foreground">
                {getFriendlyErrorMessage(error)}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isFetching}
                onClick={() => void refetch()}
              >
                {isFetching ? "Đang tải lại..." : "Thử lại"}
              </Button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Không có thông báo nào.
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItemButton
                key={notification.id}
                notification={notification}
                isPending={
                  isMarkingAllAsRead ||
                  markingNotificationId === notification.id
                }
                onMarkAsRead={markAsRead}
              />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
