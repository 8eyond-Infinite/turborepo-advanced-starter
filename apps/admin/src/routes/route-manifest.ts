import { PERMISSIONS } from "@repo/contracts";

export const adminRouteManifest = [
  { path: "/", label: "Tổng quan", permission: undefined },
  {
    path: "/users",
    label: "Quản lý Users",
    permission: PERMISSIONS.USER.READ,
  },
  {
    path: "/roles",
    label: "Phân quyền Roles",
    permission: PERMISSIONS.ROLE.READ,
  },
  {
    path: "/sessions",
    label: "Phiên đăng nhập",
    permission: PERMISSIONS.SESSION.READ,
  },
  {
    path: "/audit-logs",
    label: "Nhật ký hoạt động",
    permission: PERMISSIONS.AUDIT.READ,
  },
] as const;

export type AdminRoutePath = (typeof adminRouteManifest)[number]["path"];

export function getAdminRoute(pathname: string) {
  return adminRouteManifest.find((route) => route.path === pathname);
}

export function getAdminRouteLabel(pathname: string): string {
  return getAdminRoute(pathname)?.label ?? "Không tìm thấy trang";
}
