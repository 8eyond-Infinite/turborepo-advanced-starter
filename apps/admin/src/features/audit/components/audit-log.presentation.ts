import {
  HelpCircle,
  LogOut,
  Pencil,
  Shield,
  ShieldAlert,
  Trash2,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

export type AuditEventType =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "neutral";

export interface AuditActionMeta {
  icon: LucideIcon;
  type: AuditEventType;
  label: string;
}

const actionMetaMap: Record<string, AuditActionMeta> = {
  USER_CREATE: { icon: UserPlus, type: "success", label: "Tạo người dùng" },
  USER_UPDATE: { icon: Pencil, type: "info", label: "Cập nhật người dùng" },
  USER_TOGGLE_STATUS: {
    icon: Pencil,
    type: "warning",
    label: "Đổi trạng thái người dùng",
  },
  USER_DELETE: { icon: Trash2, type: "error", label: "Xóa người dùng" },
  SESSION_REVOKE: { icon: LogOut, type: "error", label: "Thu hồi phiên" },
  SESSION_REVOKE_ALL: {
    icon: ShieldAlert,
    type: "error",
    label: "Thu hồi mọi phiên",
  },
  SESSION_REVOKE_OTHERS: {
    icon: ShieldAlert,
    type: "warning",
    label: "Thu hồi các phiên khác",
  },
  ROLE_CREATE: { icon: Shield, type: "success", label: "Tạo vai trò" },
  ROLE_UPDATE_PERMISSIONS: {
    icon: Shield,
    type: "info",
    label: "Cập nhật quyền vai trò",
  },
  ROLE_DELETE: { icon: Shield, type: "error", label: "Xóa vai trò" },
};

export const getAuditActionMeta = (action: string): AuditActionMeta =>
  actionMetaMap[action] ?? {
    icon: HelpCircle,
    type: "neutral",
    label: action.replaceAll("_", " "),
  };

export const formatAuditTimestamp = (isoString: string): string => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;

  return date.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};
