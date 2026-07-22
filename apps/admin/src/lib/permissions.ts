import type { Permission } from '@repo/contracts';

export interface UserWithPermissions {
    permissions?: (Permission | string)[];
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(
    user: UserWithPermissions | null | undefined,
    permission?: string
): boolean {
    if (!permission) return true;
    if (!user || !Array.isArray(user.permissions)) return false;
    return user.permissions.includes(permission as Permission);
}

/**
 * Check if user has ALL of specified permissions
 */
export function hasAllPermissions(
    user: UserWithPermissions | null | undefined,
    permissions?: string[]
): boolean {
    if (!permissions || permissions.length === 0) return true;
    if (!user || !Array.isArray(user.permissions)) return false;
    return permissions.every((p) => user.permissions!.includes(p as Permission));
}

/**
 * Check if user has ANY of specified permissions
 */
export function hasAnyPermission(
    user: UserWithPermissions | null | undefined,
    permissions?: string[]
): boolean {
    if (!permissions || permissions.length === 0) return true;
    if (!user || !Array.isArray(user.permissions)) return false;
    return permissions.some((p) => user.permissions!.includes(p as Permission));
}
