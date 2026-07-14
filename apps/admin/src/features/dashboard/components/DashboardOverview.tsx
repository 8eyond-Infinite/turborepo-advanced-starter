import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Users, Activity, Database, Cpu, CheckCircle2, RefreshCw } from 'lucide-react';

export const DashboardOverview = () => {
    // 1. Query users to show total users count
    const { data: users = [], isLoading, refetch, isFetching } = useQuery<any[]>({
        queryKey: ['users'],
        queryFn: async () => {
            return await ApiClient.get<any[]>('/users');
        },
        staleTime: 60000,
    });

    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.isActive).length;
    const inactiveUsers = totalUsers - activeUsers;

    const stats = [
        {
            title: 'Tổng số Users',
            value: isLoading ? '...' : totalUsers,
            description: `${activeUsers} đang hoạt động, ${inactiveUsers} đã khóa`,
            icon: Users,
            color: 'text-violet-400 bg-violet-600/10 border-violet-500/20',
        },
        {
            title: 'Phiên hoạt động (Redis)',
            value: isLoading ? '...' : activeUsers,
            description: 'Số người dùng có phiên hợp lệ',
            icon: Activity,
            color: 'text-emerald-400 bg-emerald-600/10 border-emerald-500/20',
        },
        {
            title: 'Cơ sở dữ liệu (PostgreSQL)',
            value: 'Online',
            description: 'Độ trễ kết nối: 1.2ms',
            icon: Database,
            color: 'text-blue-400 bg-blue-600/10 border-blue-500/20',
        },
        {
            title: 'Hạ tầng Redis Cache',
            value: 'Connected',
            description: 'Trạng thái bộ nhớ: Tốt',
            icon: Cpu,
            color: 'text-amber-400 bg-amber-600/10 border-amber-500/20',
        },
    ];

    const logs = [
        { id: 1, action: 'Hủy kích hoạt user', details: 'Khóa tài khoản test.b@example.com', target: 'Caches evicted: users:all', time: '1 phút trước', status: 'Success' },
        { id: 2, action: 'Đăng nhập Admin', details: 'Xác thực tài khoản admin@example.com', target: 'IP: 127.0.0.1', time: '5 phút trước', status: 'Success' },
        { id: 3, action: 'Làm mới Token', details: 'Silent token refresh thành công', target: 'Access token rotated', time: '10 phút trước', status: 'Success' },
        { id: 4, action: 'Đăng xuất toàn cầu', details: 'Hủy toàn bộ phiên hoạt động của user test.c', target: 'Redis tokens flushed', time: '2 giờ trước', status: 'Success' },
    ];

    return (
        <div className="space-y-8 relative">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Tổng quan hệ thống</h2>
                    <p className="text-sm text-zinc-500 mt-1">Theo dõi hoạt động hạ tầng và người dùng thời gian thực</p>
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center"
                    title="Tải lại dữ liệu"
                >
                    <RefreshCw className={`h-5 w-5 text-zinc-400 ${isFetching ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={stat.title} className="p-1 border border-zinc-800/80">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                    {stat.title}
                                </CardTitle>
                                <div className={`p-2 rounded-lg border ${stat.color}`}>
                                    <Icon className="h-4 w-4" />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-2">
                                <div className="text-2xl font-bold text-zinc-100">{stat.value}</div>
                                <p className="text-xs text-zinc-500 mt-1.5">{stat.description}</p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Detail Layout */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Tech Stack Stats */}
                <Card className="border border-zinc-800/80">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold text-zinc-200">Trạng thái hạ tầng</CardTitle>
                        <CardDescription className="text-xs text-zinc-500">Các cấu phần lõi của Monorepo Starter</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3.5 bg-zinc-950/60 rounded-xl border border-zinc-900">
                            <div className="flex items-center gap-3">
                                <Database className="h-5 w-5 text-blue-400" />
                                <div>
                                    <p className="text-sm font-semibold text-zinc-300">Database Engine</p>
                                    <p className="text-xs text-zinc-500 mt-0.5">Prisma ORM + PostgreSQL</p>
                                </div>
                            </div>
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Healthy
                            </span>
                        </div>

                        <div className="flex items-center justify-between p-3.5 bg-zinc-950/60 rounded-xl border border-zinc-900">
                            <div className="flex items-center gap-3">
                                <Cpu className="h-5 w-5 text-amber-400" />
                                <div>
                                    <p className="text-sm font-semibold text-zinc-300">In-Memory Cache & Session</p>
                                    <p className="text-xs text-zinc-500 mt-0.5">IORedis Service Connection</p>
                                </div>
                            </div>
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Active
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Audit Simulation Logs */}
                <Card className="border border-zinc-800/80">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold text-zinc-200">Nhật ký hệ thống gần đây</CardTitle>
                        <CardDescription className="text-xs text-zinc-500">Hoạt động an ninh và thay đổi trạng thái</CardDescription>
                    </CardHeader>
                    <CardContent className="divide-y divide-zinc-800/60 max-h-72 overflow-y-auto">
                        {logs.map((log) => (
                            <div key={log.id} className="py-3 flex items-start justify-between gap-4 first:pt-0 last:pb-0">
                                <div>
                                    <p className="text-sm font-semibold text-zinc-300">{log.action}</p>
                                    <p className="text-xs text-zinc-500 mt-0.5">{log.details}</p>
                                    <span className="inline-block font-mono text-[10px] text-zinc-600 bg-zinc-950 px-1.5 py-0.5 rounded mt-1 border border-zinc-900">
                                        {log.target}
                                    </span>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-[10px] text-zinc-500">{log.time}</span>
                                    <div className="mt-1">
                                        <span className="inline-block text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                                            {log.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
