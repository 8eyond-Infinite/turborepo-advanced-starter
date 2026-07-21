export interface ApiResponse<T = any> {
    data?: T;
    message?: string;
    statusCode: number;
}
