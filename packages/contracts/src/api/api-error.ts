export interface ApiErrorResponse {
  statusCode: number;
  code: string;
  translationKey: string;
  message: string;
  args: Record<string, unknown>;
  error?: string;
  timestamp: string;
  details?: unknown;
}
