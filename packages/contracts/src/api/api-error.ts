export interface ApiErrorResponse {
    statusCode: number;
    code: string;
    translationKey: string;
    message: string;
    args: Record<string, any>;
    error?: string;
    timestamp: string;
    details?: any;
}
