import type { Permission } from './permissions.js';

export interface CurrentUser {
    id: string;
    email: string;
    username: string;
    roles: string[];
    permissions: Permission[];
    avatar?: string | null;
}
