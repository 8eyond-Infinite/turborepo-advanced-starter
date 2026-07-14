import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from './protected-route';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { UserTable } from '@/features/users/components/UserTable';
import { DashboardOverview } from '@/features/dashboard/components/DashboardOverview';

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
                        element: <DashboardOverview />,
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
