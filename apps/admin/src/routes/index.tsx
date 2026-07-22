import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from './protected-route';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { ForbiddenPage } from '@/features/auth/components/ForbiddenPage';
import { UserTable } from '@/features/users/components/UserTable';
import { DashboardOverview } from '@/features/dashboard/components/DashboardOverview';
import { RolesManagement } from '@/features/roles/components/RolesManagement';
import { SessionsManagement } from '@/features/sessions/components/SessionsManagement';
import { AuditLogsManagement } from '@/features/audit/components/AuditLogsManagement';
import { PermissionGuard } from '@/hooks/usePermission';
import { PERMISSIONS } from '@repo/contracts';

// Clean Route Config with metadata permissions
export const adminRoutes = [
    {
        path: '/',
        element: <DashboardOverview />,
    },
    {
        path: '/users',
        element: <UserTable />,
        permission: PERMISSIONS.USER.READ,
    },
    {
        path: '/roles',
        element: <RolesManagement />,
        permission: PERMISSIONS.ROLE.READ,
    },
    {
        path: '/sessions',
        element: <SessionsManagement />,
        permission: PERMISSIONS.SESSION.READ,
    },
    {
        path: '/audit-logs',
        element: <AuditLogsManagement />,
        permission: PERMISSIONS.AUDIT.READ,
    },
];

export const router = createBrowserRouter([
    {
        path: '/login',
        element: <LoginForm />,
    },
    {
        path: '/403',
        element: <ForbiddenPage />,
    },
    {
        element: <ProtectedRoute />,
        children: [
            {
                element: <MainLayout />,
                children: adminRoutes.map((route) => ({
                    path: route.path,
                    element: (
                        <PermissionGuard permission={route.permission} fallback={<ForbiddenPage />}>
                            {route.element}
                        </PermissionGuard>
                    ),
                })),
            },
        ],
    },
    {
        path: '*',
        element: <Navigate to="/" replace />,
    },
]);
