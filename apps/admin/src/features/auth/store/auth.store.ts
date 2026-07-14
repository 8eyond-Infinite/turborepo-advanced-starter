import { create } from 'zustand';
import { ApiClient } from '@/lib/api-client';

interface AuthState {
    user: any | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    setAuth: (user: any, accessToken: string, refreshToken: string) => void;
    clearAuth: () => void;
    initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    setAuth: (user, accessToken, refreshToken) => {
        ApiClient.setToken(accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        set({ user, isAuthenticated: true, isLoading: false });
    },
    clearAuth: () => {
        ApiClient.setToken(null);
        localStorage.removeItem('refresh_token');
        set({ user: null, isAuthenticated: false, isLoading: false });
    },
    initialize: async () => {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
            set({ user: null, isAuthenticated: false, isLoading: false });
            return;
        }

        try {
            // Trigger a refresh to get access token
            const data = await ApiClient.post<any>('/auth/refresh', {}, { 
                skipAuth: true, 
                headers: { 'Authorization': `Bearer ${refreshToken}` } 
            });
            
            ApiClient.setToken(data.accessToken);
            localStorage.setItem('refresh_token', data.refreshToken);

            // Fetch current user
            const user = await ApiClient.get<any>('/users/me');
            set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
            ApiClient.setToken(null);
            localStorage.removeItem('refresh_token');
            set({ user: null, isAuthenticated: false, isLoading: false });
        }
    }
}));
