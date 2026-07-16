import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from './protected-route';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { UserTable } from '@/features/users/components/UserTable';
import { DashboardOverview } from '@/features/dashboard/components/DashboardOverview';
import { RolesManagement } from '@/features/roles/components/RolesManagement';
import { SessionsManagement } from '@/features/sessions/components/SessionsManagement';

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
                    {
                        path: '/roles',
                        element: <RolesManagement />,
                    },
                    {
                        path: '/sessions',
                        element: <SessionsManagement />,
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
