import React from 'react';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { hasPermission, hasAllPermissions, hasAnyPermission } from '@/lib/permissions';

export type PermissionInput = string | string[] | { all?: string[]; any?: string[] };

export interface PermissionEvaluator {
    can: (permission?: string) => boolean;
    any: (permissions?: string[]) => boolean;
    all: (permissions?: string[]) => boolean;
}

/**
 * Enterprise usePermission hook:
 *
 * Usage Option 1 (Evaluator object with methods):
 * const { can, any, all } = usePermission();
 * if (can(PERMISSIONS.USER.CREATE)) { ... }
 * if (any([PERMISSIONS.USER.UPDATE, PERMISSIONS.USER.DELETE])) { ... }
 *
 * Usage Option 2 (Semantic map object):
 * const access = usePermission({
 *   canManageUsers: [PERMISSIONS.USER.UPDATE, PERMISSIONS.USER.DELETE],
 *   canCreateUser: PERMISSIONS.USER.CREATE,
 * });
 * if (access.canManageUsers) { ... }
 */
export function usePermission(): PermissionEvaluator;
export function usePermission<T extends Record<string, PermissionInput>>(
    permissionMap: T
): Record<keyof T, boolean>;
export function usePermission<T extends Record<string, PermissionInput>>(
    permissionMap?: T
): PermissionEvaluator | Record<keyof T, boolean> {
    const { user } = useAuthStore();

    const can = (permission?: string) => hasPermission(user, permission);
    const any = (permissions?: string[]) => hasAnyPermission(user, permissions);
    const all = (permissions?: string[]) => hasAllPermissions(user, permissions);

    if (!permissionMap) {
        return { can, any, all };
    }

    const result = {} as Record<keyof T, boolean>;
    for (const key in permissionMap) {
        const val = permissionMap[key];
        if (typeof val === 'string') {
            result[key] = can(val);
        } else if (Array.isArray(val)) {
            result[key] = any(val);
        } else if (val && typeof val === 'object') {
            if (val.all) {
                result[key] = all(val.all);
            } else if (val.any) {
                result[key] = any(val.any);
            } else {
                result[key] = false;
            }
        } else {
            result[key] = false;
        }
    }

    return result;
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
export function Can({ I, permission, any: anyPerms, all: allPerms, children, fallback = null }: CanProps) {
    const { can, any, all } = usePermission();

    const targetPermission = permission || I;
    let isAllowed = true;

    if (targetPermission) {
        isAllowed = can(targetPermission);
    } else if (allPerms && allPerms.length > 0) {
        isAllowed = all(allPerms);
    } else if (anyPerms && anyPerms.length > 0) {
        isAllowed = any(anyPerms);
    }

    if (!isAllowed) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

export const PermissionGuard = Can;
