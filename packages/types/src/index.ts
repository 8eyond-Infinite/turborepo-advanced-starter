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
    isActive: boolean;
    isDeleted: boolean;
    roles: string[];
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
}

export interface Role {
    id: string;
    name: string;
    description?: string;
    permissions: string[];
    createdAt?: string;
}

export interface Permission {
    id: string;
    name: string;
    description: string;
}

export interface AuditLog {
    id: string;
    action: string;
    details: string;
    userId?: string | null;
    userEmail?: string | null;
    ip?: string | null;
    userAgent?: string | null;
    createdAt: string;
}
