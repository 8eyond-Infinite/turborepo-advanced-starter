export interface PaginatedMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginatedMeta;
}

export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string | null;
  isActive: boolean;
  isDeleted: boolean;
  roles: string[];
  permissions?: string[];
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface ActiveSession {
  jti: string;
  ip: string;
  userAgent: string;
  createdAt: string;
  absoluteExpiresAt?: string;
  isCurrent?: boolean;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  createdAt?: string;
}

// Bản ghi permission trong database (dùng cho màn hình quản trị role).
// Phân biệt với union type `Permission` của @repo/contracts — bên đó là
// CHUỖI định danh quyền ('user:read'), bên này là ROW dữ liệu.
export interface PermissionRecord {
  id: string;
  name: string;
  description: string | null;
  displayName?: string | null;
  module?: string | null;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  userId?: string | null;
  userEmail?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  correlationId?: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}
