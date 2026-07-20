import { create } from 'zustand';
import { ApiClient } from '@/lib/api-client';

import type { User } from '@repo/types';

interface LoginCredentials {
    email: string;
    password?: string;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isInitializing?: boolean;
    setAuth: (user: User, accessToken: string, refreshToken: string) => void;
    clearAuth: () => void;
    initialize: () => Promise<void>;
    login: (credentials: LoginCredentials) => Promise<void>;
    logout: () => Promise<void>;
    logoutGlobal: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    isInitializing: false,
    setAuth: (user, accessToken, refreshToken) => {
        ApiClient.setToken(accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        set({ user, isAuthenticated: true, isLoading: false, isInitializing: false });
    },
    clearAuth: () => {
        ApiClient.setToken(null);
        localStorage.removeItem('refresh_token');
        set({ user: null, isAuthenticated: false, isLoading: false, isInitializing: false });
    },
    initialize: async () => {
        if (get().isInitializing) {
            return;
        }
        set({ isInitializing: true });

        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
            set({ user: null, isAuthenticated: false, isLoading: false, isInitializing: false });
            return;
        }

        try {
            const data = await ApiClient.post<any>('/auth/refresh', {}, {
                skipAuth: true,
                headers: { 'Authorization': `Bearer ${refreshToken}` }
            });

            ApiClient.setToken(data.accessToken);
            localStorage.setItem('refresh_token', data.refreshToken);

            const user = await ApiClient.get<any>('/users/me');
            set({ user, isAuthenticated: true, isLoading: false, isInitializing: false });
        } catch (error) {
            console.error('[AuthStore Initialize Error]', error);
            ApiClient.setToken(null);
            localStorage.removeItem('refresh_token');
            set({ user: null, isAuthenticated: false, isLoading: false, isInitializing: false });
        }
    },
    login: async (credentials: LoginCredentials) => {
        const tokens = await ApiClient.post<{ accessToken: string; refreshToken: string }>(
            '/auth/login',
            credentials,
            { skipAuth: true }
        );

        ApiClient.setToken(tokens.accessToken);
        localStorage.setItem('refresh_token', tokens.refreshToken);

        const user = await ApiClient.get<User>('/users/me');
        set({ user, isAuthenticated: true, isLoading: false, isInitializing: false });
    },
    logout: async () => {
        try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
                await ApiClient.post('/auth/logout', {}, {
                    skipAuth: true,
                    headers: { 'Authorization': `Bearer ${refreshToken}` }
                });
            }
        } catch (error) {
            console.error('[AuthStore Single Logout Error]', error);
        } finally {
            get().clearAuth();
        }
    },
    logoutGlobal: async () => {
        try {
            await ApiClient.post('/auth/logout/global');
        } catch (error) {
            console.error('[AuthStore Global Logout Error]', error);
        } finally {
            get().clearAuth();
        }
    }
}));
