export interface PaginatedResult<T = unknown> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
