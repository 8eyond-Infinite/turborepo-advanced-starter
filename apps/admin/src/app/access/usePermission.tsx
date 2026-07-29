import React, { useCallback, useMemo } from "react";
import { useAuthStore } from "@/features/auth";
import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
} from "@/lib/permissions";

export type PermissionInput =
  | string
  | string[]
  | { all?: string[]; any?: string[] };

export interface PermissionEvaluator {
  can: (permission?: string) => boolean;
  any: (permissions?: string[]) => boolean;
  all: (permissions?: string[]) => boolean;
}

/**
 * Usage option 1 (evaluator object):
 * const { can, any, all } = usePermission();
 * if (can(PERMISSIONS.USER.CREATE)) { ... }
 * if (any([PERMISSIONS.USER.UPDATE, PERMISSIONS.USER.DELETE])) { ... }
 *
 * Usage option 2 (named decisions):
 * const access = usePermission({
 *   canManageUsers: [PERMISSIONS.USER.UPDATE, PERMISSIONS.USER.DELETE],
 *   canCreateUser: PERMISSIONS.USER.CREATE,
 * });
 * if (access.canManageUsers) { ... }
 */
export function usePermission(): PermissionEvaluator;
export function usePermission<T extends Record<string, PermissionInput>>(
  permissionMap: T,
): Record<keyof T, boolean>;
export function usePermission<T extends Record<string, PermissionInput>>(
  permissionMap?: T,
): PermissionEvaluator | Record<keyof T, boolean> {
  const user = useAuthStore((state) => state.user);

  const can = useCallback(
    (permission?: string) => hasPermission(user, permission),
    [user],
  );
  const any = useCallback(
    (permissions?: string[]) => hasAnyPermission(user, permissions),
    [user],
  );
  const all = useCallback(
    (permissions?: string[]) => hasAllPermissions(user, permissions),
    [user],
  );

  const evaluator = useMemo(() => ({ can, any, all }), [all, any, can]);

  const decisions = useMemo(() => {
    const result = {} as Record<keyof T, boolean>;
    if (!permissionMap) {
      return result;
    }

    for (const key in permissionMap) {
      const val = permissionMap[key];
      if (typeof val === "string") {
        result[key] = can(val);
      } else if (Array.isArray(val)) {
        result[key] = any(val);
      } else if (val && typeof val === "object") {
        const hasAllRequirement = val.all !== undefined;
        const hasAnyRequirement = val.any !== undefined;
        result[key] =
          (hasAllRequirement || hasAnyRequirement) &&
          (!hasAllRequirement || all(val.all)) &&
          (!hasAnyRequirement || any(val.any));
      } else {
        result[key] = false;
      }
    }
    return result;
  }, [all, any, can, permissionMap]);

  return permissionMap ? decisions : evaluator;
}

// Alias for backward compatibility
export const usePermissions = usePermission;

export interface CanProps {
  I?: string;
  permission?: string;
  any?: string[];
  all?: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * <Can /> component delegates 100% to usePermission() hook under the hood
 */
export function Can({
  I,
  permission,
  any: anyPerms,
  all: allPerms,
  children,
  fallback = null,
}: CanProps) {
  const { can, any, all } = usePermission();

  const targetPermission = permission || I;
  let isAllowed = true;

  if (targetPermission) {
    isAllowed = can(targetPermission);
  } else {
    if (allPerms !== undefined) {
      isAllowed = isAllowed && all(allPerms);
    }
    if (anyPerms !== undefined) {
      isAllowed = isAllowed && any(anyPerms);
    }
  }

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export const PermissionGuard = Can;
