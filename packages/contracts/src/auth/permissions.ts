export const PERMISSIONS = {
    USER: {
        CREATE: 'user:create',
        READ: 'user:read',
        UPDATE: 'user:update',
        DELETE: 'user:delete',
    },
    ROLE: {
        CREATE: 'role:create',
        READ: 'role:read',
        UPDATE: 'role:update',
        DELETE: 'role:delete',
    },
    SESSION: {
        READ: 'session:read',
        DELETE: 'session:delete',
    },
    AUDIT: {
        READ: 'audit:read',
    },
} as const;

type ValueOf<T> = T[keyof T];
export type Permission = ValueOf<{
    [K in keyof typeof PERMISSIONS]: ValueOf<(typeof PERMISSIONS)[K]>;
}>;

// Alias for backward compatibility
export type PermissionType = Permission;
