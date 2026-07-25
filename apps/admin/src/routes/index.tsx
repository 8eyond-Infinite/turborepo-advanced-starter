import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { ProtectedRoute } from "./protected-route";
import { PermissionGuard } from "@/hooks/usePermission";
import { PERMISSIONS } from "@repo/contracts";
import { RouteErrorPage } from "./route-error-page";

const LoginForm = lazy(() =>
  import("@/features/auth/components/LoginForm").then((module) => ({
    default: module.LoginForm,
  })),
);
const ForbiddenPage = lazy(() =>
  import("@/features/auth/components/ForbiddenPage").then((module) => ({
    default: module.ForbiddenPage,
  })),
);
const UserTable = lazy(() =>
  import("@/features/users/components/UserTable").then((module) => ({
    default: module.UserTable,
  })),
);
const DashboardOverview = lazy(() =>
  import("@/features/dashboard/components/DashboardOverview").then(
    (module) => ({ default: module.DashboardOverview }),
  ),
);
const RolesManagement = lazy(() =>
  import("@/features/roles/components/RolesManagement").then((module) => ({
    default: module.RolesManagement,
  })),
);
const SessionsManagement = lazy(() =>
  import("@/features/sessions/components/SessionsManagement").then(
    (module) => ({ default: module.SessionsManagement }),
  ),
);
const AuditLogsManagement = lazy(() =>
  import("@/features/audit/components/AuditLogsManagement").then((module) => ({
    default: module.AuditLogsManagement,
  })),
);

const RouteFallback = () => (
  <div
    className="flex min-h-64 items-center justify-center"
    role="status"
    aria-label="Đang tải trang"
  >
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const withSuspense = (element: ReactNode) => (
  <Suspense fallback={<RouteFallback />}>{element}</Suspense>
);

// Clean Route Config with metadata permissions
export const adminRoutes = [
  {
    path: "/",
    element: withSuspense(<DashboardOverview />),
  },
  {
    path: "/users",
    element: withSuspense(<UserTable />),
    permission: PERMISSIONS.USER.READ,
  },
  {
    path: "/roles",
    element: withSuspense(<RolesManagement />),
    permission: PERMISSIONS.ROLE.READ,
  },
  {
    path: "/sessions",
    element: withSuspense(<SessionsManagement />),
    permission: PERMISSIONS.SESSION.READ,
  },
  {
    path: "/audit-logs",
    element: withSuspense(<AuditLogsManagement />),
    permission: PERMISSIONS.AUDIT.READ,
  },
];

export const router = createBrowserRouter([
  {
    path: "/login",
    element: withSuspense(<LoginForm />),
    errorElement: <RouteErrorPage />,
  },
  {
    path: "/403",
    element: withSuspense(<ForbiddenPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    element: <ProtectedRoute />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <MainLayout />,
        children: adminRoutes.map((route) => ({
          path: route.path,
          element: (
            <PermissionGuard
              permission={route.permission}
              fallback={withSuspense(<ForbiddenPage />)}
            >
              {route.element}
            </PermissionGuard>
          ),
        })),
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
    errorElement: <RouteErrorPage />,
  },
]);
