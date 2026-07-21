export interface PaginatedResult<T = any> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
