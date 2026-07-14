import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { ApiClient } from '@/lib/api-client';
import { LayoutDashboard, Users, Shield, LogOut, Globe, User } from 'lucide-react';

export const MainLayout = () => {
    const { user, clearAuth } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        try {
            await ApiClient.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            clearAuth();
            navigate('/login');
        }
    };

    const handleGlobalLogout = async () => {
        try {
            await ApiClient.post('/auth/logout/global');
        } catch (error) {
            console.error('Global logout error:', error);
        } finally {
            clearAuth();
            navigate('/login');
        }
    };

    const navItems = [
        { path: '/', label: 'Tổng quan', icon: LayoutDashboard },
        { path: '/users', label: 'Quản lý Users', icon: Users },
    ];

    return (
        <div className="flex min-h-screen bg-zinc-950 text-zinc-100 font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col shrink-0">
                {/* Brand Logo */}
                <div className="h-16 border-b border-zinc-800 flex items-center px-6 gap-3">
                    <Shield className="h-6 w-6 text-violet-400" />
                    <span className="font-bold text-lg tracking-wider text-zinc-200">STARTER ADMIN</span>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 px-4 py-6 space-y-1.5">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                                    isActive
                                        ? 'bg-violet-600/10 border border-violet-500/20 text-violet-400'
                                        : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 border border-transparent'
                                }`}
                            >
                                <Icon className="h-5 w-5" />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* User Info Footer */}
                {user && (
                    <div className="p-4 border-t border-zinc-800 bg-zinc-900/40 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                            <User className="h-5 w-5 text-zinc-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-zinc-300 truncate">{user.email.split('@')[0]}</p>
                            <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                        </div>
                    </div>
                )}
            </aside>

            {/* Main Content Pane */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-16 bg-zinc-900/60 backdrop-blur border-b border-zinc-800 flex items-center justify-between px-8 z-20">
                    <h1 className="text-lg font-bold text-zinc-200">
                        {navItems.find((item) => item.path === location.pathname)?.label || 'Dashboard'}
                    </h1>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700/80 text-zinc-300 hover:text-zinc-100 px-4 py-2 rounded-xl text-sm font-medium border border-zinc-700/60 transition-colors cursor-pointer"
                            title="Chỉ đăng xuất trên trình duyệt hiện tại"
                        >
                            <LogOut className="h-4 w-4" />
                            <span>Đăng xuất</span>
                        </button>

                        <button
                            onClick={handleGlobalLogout}
                            className="flex items-center gap-2 bg-red-950/20 hover:bg-red-950/40 text-red-400 hover:text-red-300 px-4 py-2 rounded-xl text-sm font-medium border border-red-900/30 transition-colors cursor-pointer"
                            title="Đăng xuất khỏi tất cả các thiết bị"
                        >
                            <Globe className="h-4 w-4" />
                            <span>Đăng xuất toàn cầu</span>
                        </button>
                    </div>
                </header>

                {/* Subpage Container */}
                <main className="flex-1 p-8 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
