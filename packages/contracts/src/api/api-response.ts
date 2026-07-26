export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  statusCode: number;
}
