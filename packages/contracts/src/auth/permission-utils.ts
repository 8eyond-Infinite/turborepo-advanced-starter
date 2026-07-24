import type { Permission, PermissionType } from './permissions.js';

export const hasPermission = (
    userPermissions: PermissionType[] | string[] | undefined | null,
    permission: PermissionType | string,
): boolean => {
    if (!userPermissions || userPermissions.length === 0) return false;
    return userPermissions.includes(permission as Permission);
};

export const hasAllPermissions = (
    userPermissions: PermissionType[] | string[] | undefined | null,
    requiredPermissions: PermissionType[] | string[],
): boolean => {
    if (!requiredPermissions || requiredPermissions.length === 0) return true;
    if (!userPermissions || userPermissions.length === 0) return false;
    return requiredPermissions.every((p) => userPermissions.includes(p as Permission));
};

export const hasAnyPermission = (
    userPermissions: PermissionType[] | string[] | undefined | null,
    requiredPermissions: PermissionType[] | string[],
): boolean => {
    if (!requiredPermissions || requiredPermissions.length === 0) return true;
    if (!userPermissions || userPermissions.length === 0) return false;
    return requiredPermissions.some((p) => userPermissions.includes(p as Permission));
};
