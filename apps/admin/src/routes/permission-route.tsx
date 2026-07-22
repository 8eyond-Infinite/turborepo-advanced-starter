import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/auth.store';

interface PermissionRouteProps {
    requiredPermission?: string;
    requiredPermissions?: string[];
}

export const PermissionRoute = ({ requiredPermission, requiredPermissions }: PermissionRouteProps) => {
    const { user, isAuthenticated, isLoading } = useAuthStore();

    if (isLoading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-400">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-700 border-t-zinc-200"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    const permissionsNeeded = requiredPermissions || (requiredPermission ? [requiredPermission] : []);
    const userPermissions = user?.permissions || [];

    const hasPermission = permissionsNeeded.every((permission) =>
        userPermissions.includes(permission)
    );

    if (permissionsNeeded.length > 0 && !hasPermission) {
        return <Navigate to="/403" replace />;
    }

    return <Outlet />;
};
