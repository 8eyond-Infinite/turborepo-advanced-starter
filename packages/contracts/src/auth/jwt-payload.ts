import type { Permission } from './permissions.js';

export interface JwtPayload {
    sub: string;
    email: string;
    permissions: Permission[];
    jti?: string;
}
