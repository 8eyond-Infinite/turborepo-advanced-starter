import type { PermissionRecord, Role } from "@repo/types";
import { ApiClient } from "@/lib/api-client";

export interface CreateRoleInput {
  name: string;
  description?: string;
}

export interface UpdateRolePermissionsInput {
  roleId: string;
  permissions: string[];
}

export const roleApi = {
  getRoles: () => ApiClient.get<Role[]>("/roles"),
  getPermissions: () => ApiClient.get<PermissionRecord[]>("/roles/permissions"),
  create: (input: CreateRoleInput) => ApiClient.post<Role>("/roles", input),
  remove: (roleId: string) => ApiClient.delete<void>(`/roles/${roleId}`),
  updatePermissions: ({ roleId, permissions }: UpdateRolePermissionsInput) =>
    ApiClient.put<Role>(`/roles/${roleId}/permissions`, { permissions }),
};
