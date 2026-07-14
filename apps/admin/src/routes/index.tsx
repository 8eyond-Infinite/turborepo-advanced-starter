import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from './protected-route';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { UserTable } from '@/features/users/components/UserTable';

export const router = createBrowserRouter([
    {
        path: '/login',
        element: <LoginForm />,
    },
    {
        element: <ProtectedRoute />,
        children: [
            {
                element: <MainLayout />,
                children: [
                    {
                        path: '/',
                        element: (
                            <div className="space-y-6">
                                <div className="p-8 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl relative overflow-hidden">
                                    {/* Ambient glow */}
                                    <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-violet-600/10 blur-[60px] pointer-events-none"></div>
                                    <h2 className="text-2xl font-bold text-zinc-100">Chào mừng đến với hệ thống Admin Panel</h2>
                                    <p className="text-zinc-400 mt-2 leading-relaxed max-w-2xl">
                                        Hệ thống quản trị hoàn chỉnh kết nối trực tiếp với Backend API Server được thiết kế theo chuẩn Clean Architecture & Domain-Driven Design (DDD).
                                    </p>
                                    <div className="mt-6 flex items-center gap-3 text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                                        <span>React 19</span>
                                        <span>•</span>
                                        <span>Tailwind CSS v4</span>
                                        <span>•</span>
                                        <span>Zustand</span>
                                        <span>•</span>
                                        <span>React Query</span>
                                    </div>
                                </div>
                            </div>
                        ),
                    },
                    {
                        path: '/users',
                        element: <UserTable />,
                    },
                ],
            },
        ],
    },
    {
        path: '*',
        element: <Navigate to="/" replace />,
    },
]);
