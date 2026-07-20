import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { ApiClient } from '@/lib/api-client';
import { toast } from 'sonner';

export const useWebSocket = () => {
    const socketRef = useRef<Socket | null>(null);
    const { isAuthenticated, logout } = useAuthStore();

    useEffect(() => {
        if (!isAuthenticated) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            return;
        }

        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        
        // Retrieve token from ApiClient
        const accessToken = ApiClient.getToken();

        const socket = io(baseUrl, {
            auth: {
                token: accessToken,
            },
            query: {
                token: accessToken || '',
            },
            transports: ['websocket'],
            autoConnect: true,
            reconnection: true,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to real-time gateway');
        });

        socket.on('disconnect', (reason) => {
            console.log('Disconnected from real-time gateway:', reason);
        });

        socket.on('force_logout', (data: { message?: string }) => {
            toast.error(data.message || 'Tài khoản của bạn đã bị khóa hoặc thu hồi quyền truy cập.', {
                duration: 5000,
            });
            // Perform global logout sequence
            logout();
        });

        socket.on('notification', (data: { message: string; type?: 'info' | 'success' | 'warning' | 'error' }) => {
            const msgType = data.type || 'info';
            if (msgType === 'success') toast.success(data.message);
            else if (msgType === 'error') toast.error(data.message);
            else if (msgType === 'warning') toast.warning(data.message);
            else toast.info(data.message);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [isAuthenticated, logout]);

    return socketRef.current;
};
