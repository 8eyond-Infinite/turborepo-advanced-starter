export class ApiError extends Error {
    public readonly status: number;
    public readonly code?: string;
    public readonly details?: any;
    public readonly translationKey?: string;
    public readonly args?: Record<string, any>;

    constructor(
        message: string,
        status: number,
        code?: string,
        details?: any,
        translationKey?: string,
        args?: Record<string, any>
    ) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
        this.translationKey = translationKey;
        this.args = args;
        this.name = 'ApiError';
    }
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface RequestOptions extends RequestInit {
    skipAuth?: boolean;
}

export class ApiClient {
    private static accessToken: string | null = null;
    private static isRefreshing = false;
    private static refreshSubscribers: ((token: string) => void)[] = [];

    public static setToken(token: string | null) {
        this.accessToken = token;
    }

    public static getToken(): string | null {
        return this.accessToken;
    }

    private static onRefreshed(token: string) {
        this.refreshSubscribers.map((cb) => cb(token));
        this.refreshSubscribers = [];
    }

    private static addRefreshSubscriber(cb: (token: string) => void) {
        this.refreshSubscribers.push(cb);
    }

    public static async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
        const url = `${API_URL}${path}`;
        const headers = new Headers(options.headers || {});

        if (!options.skipAuth && this.accessToken) {
            headers.set('Authorization', `Bearer ${this.accessToken}`);
        }

        if (options.body && !(options.body instanceof FormData)) {
            headers.set('Content-Type', 'application/json');
        }

        const config: RequestInit = {
            ...options,
            headers,
        };

        try {
            const response = await fetch(url, config);

            if (response.status === 401 && !options.skipAuth) {
                // If unauthorized and we have a refresh token, try silent refresh
                return this.handle401Error<T>(path, options);
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new ApiError(
                    errorData.message || `HTTP error! status: ${response.status}`,
                    response.status,
                    errorData.code || errorData.error || undefined,
                    errorData.details || undefined,
                    errorData.translationKey || undefined,
                    errorData.args || undefined
                );
            }

            if (response.status === 204) {
                return {} as T;
            }

            return await response.json();
        } catch (error: any) {
            throw error;
        }
    }

    private static async handle401Error<T>(path: string, options: RequestOptions): Promise<T> {
        if (!this.isRefreshing) {
            this.isRefreshing = true;

            try {
                const refreshUrl = `${API_URL}/auth/refresh`;
                // Read refresh token from storage
                const storedRefreshToken = localStorage.getItem('refresh_token');

                if (!storedRefreshToken) {
                    throw new Error('No refresh token available');
                }

                const refreshResponse = await fetch(refreshUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${storedRefreshToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!refreshResponse.ok) {
                    throw new Error('Refresh token expired');
                }

                const data = await refreshResponse.json();
                this.accessToken = data.accessToken;
                localStorage.setItem('refresh_token', data.refreshToken);
                this.isRefreshing = false;
                this.onRefreshed(data.accessToken);
            } catch (refreshError) {
                this.isRefreshing = false;
                this.accessToken = null;
                localStorage.removeItem('refresh_token');
                window.dispatchEvent(new Event('auth:logout'));
                throw refreshError;
            }
        }

        return new Promise<T>((resolve, reject) => {
            this.addRefreshSubscriber((token) => {
                const headers = new Headers(options.headers || {});
                headers.set('Authorization', `Bearer ${token}`);
                this.request<T>(path, { ...options, headers })
                    .then(resolve)
                    .catch(reject);
            });
        });
    }

    public static async get<T>(path: string, options: RequestOptions = {}): Promise<T> {
        return this.request<T>(path, { ...options, method: 'GET' });
    }

    public static async post<T>(path: string, body?: any, options: RequestOptions = {}): Promise<T> {
        return this.request<T>(path, {
            ...options,
            method: 'POST',
            body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
        });
    }

    public static async put<T>(path: string, body?: any, options: RequestOptions = {}): Promise<T> {
        return this.request<T>(path, {
            ...options,
            method: 'PUT',
            body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
        });
    }

    public static async patch<T>(path: string, body?: any, options: RequestOptions = {}): Promise<T> {
        return this.request<T>(path, {
            ...options,
            method: 'PATCH',
            body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
        });
    }

    public static async delete<T>(path: string, options: RequestOptions = {}): Promise<T> {
        return this.request<T>(path, { ...options, method: 'DELETE' });
    }
}
