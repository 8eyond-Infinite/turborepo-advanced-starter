import type { Notification } from "@repo/types";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle,
  Info,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale/vi";

interface NotificationItemButtonProps {
  notification: Notification;
  isPending: boolean;
  onMarkAsRead: (id: string) => Promise<void>;
}

const NotificationTypeIcon = ({ type }: { type: string }) => {
  const iconClass = "mr-2 h-4 w-4 shrink-0";
  switch (type.toUpperCase()) {
    case "SUCCESS":
      return (
        <CheckCircle
          aria-hidden="true"
          className={`${iconClass} text-green-500`}
        />
      );
    case "WARNING":
      return (
        <AlertTriangle
          aria-hidden="true"
          className={`${iconClass} text-amber-500`}
        />
      );
    case "ERROR":
    case "DANGER":
      return (
        <AlertCircle
          aria-hidden="true"
          className={`${iconClass} text-red-500`}
        />
      );
    default:
      return (
        <Info aria-hidden="true" className={`${iconClass} text-blue-500`} />
      );
  }
};

const formatNotificationTime = (dateString: string) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "vừa xong";
  return formatDistanceToNow(date, { addSuffix: true, locale: vi });
};

export const NotificationItemButton = ({
  notification,
  isPending,
  onMarkAsRead,
}: NotificationItemButtonProps) => {
  const isActionable = !notification.isRead;
  const handleMarkAsRead = () => {
    void onMarkAsRead(notification.id).catch(() => undefined);
  };

  return (
    <button
      type="button"
      disabled={!isActionable || isPending}
      aria-label={
        isActionable
          ? `Đánh dấu đã đọc: ${notification.title}`
          : `Đã đọc: ${notification.title}`
      }
      onClick={handleMarkAsRead}
      className={`w-full p-4 text-left transition-colors ${
        notification.isRead
          ? "cursor-default opacity-60"
          : "cursor-pointer bg-accent/20 hover:bg-accent"
      } disabled:pointer-events-none`}
    >
      <span className="flex items-start justify-between">
        <span className="flex min-w-0 items-center">
          <NotificationTypeIcon type={notification.type} />
          <span className="max-w-[180px] truncate text-xs font-semibold text-foreground">
            {notification.title}
          </span>
        </span>
        {!notification.isRead && (
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-full bg-primary"
          />
        )}
      </span>
      <span className="mt-1 block line-clamp-3 pl-6 text-xs leading-relaxed text-muted-foreground">
        {notification.content}
      </span>
      <span className="mt-2 flex items-center justify-between pl-6 text-[10px] text-muted-foreground">
        <time dateTime={notification.createdAt}>
          {formatNotificationTime(notification.createdAt)}
        </time>
        {!notification.isRead && (
          <span className="flex items-center gap-0.5 text-[9px] text-primary">
            <Check aria-hidden="true" className="h-2.5 w-2.5" />
            Đánh dấu đọc
          </span>
        )}
      </span>
    </button>
  );
};
