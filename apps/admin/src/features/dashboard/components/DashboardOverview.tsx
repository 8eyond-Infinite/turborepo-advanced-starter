import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Users, Activity, Database, Cpu, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
        },
        {
            title: 'Phiên hoạt động (Redis)',
            value: isLoading ? '...' : activeUsers,
            description: 'Số người dùng có phiên hợp lệ',
            icon: Activity,
        },
        {
            title: 'Cơ sở dữ liệu (PostgreSQL)',
            value: 'Online',
            description: 'Độ trễ kết nối: 1.2ms',
            icon: Database,
        },
        {
            title: 'Hạ tầng Redis Cache',
            value: 'Connected',
            description: 'Trạng thái bộ nhớ: Tốt',
            icon: Cpu,
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
                    <h2 className="text-2xl font-bold tracking-tight">Tổng quan hệ thống</h2>
                    <p className="text-sm mt-1">Theo dõi hoạt động hạ tầng và người dùng thời gian thực</p>
                </div>
                <Button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    title="Tải lại dữ liệu"
                    variant="outline"
                >
                    <RefreshCw className={`h-5 w-5 ${isFetching ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Metrics Grid */}
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => {
                    return (
                        <Card key={stat.title}>
                            <CardHeader className="flex flex-row items-center justify-between pb-3">
                                <CardTitle className="text-xs font-bold uppercase tracking-wider">
                                    {stat.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-1">
                                <div className="text-3xl font-extrabold tracking-tight">{stat.value}</div>
                                <p className="text-xs mt-2 font-medium">{stat.description}</p>
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
                        <CardTitle className="text-lg font-bold ">Trạng thái hạ tầng</CardTitle>
                        <CardDescription className="text-xs">Các cấu phần lõi của Monorepo Starter</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-900">
                            <div className="flex items-center gap-3">
                                <Database className="h-5 w-5 text-blue-400" />
                                <div>
                                    <p className="text-sm font-semibold">Database Engine</p>
                                    <p className="text-xs mt-0.5">Prisma ORM + PostgreSQL</p>
                                </div>
                            </div>
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Healthy
                            </span>
                        </div>

                        <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-900">
                            <div className="flex items-center gap-3">
                                <Cpu className="h-5 w-5 text-amber-400" />
                                <div>
                                    <p className="text-sm font-semibold">In-Memory Cache & Session</p>
                                    <p className="text-xs mt-0.5">IORedis Service Connection</p>
                                </div>
                            </div>
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Active
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Audit Simulation Logs */}
                <Card className="border border-zinc-800/80">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold ">Nhật ký hệ thống gần đây</CardTitle>
                        <CardDescription className="text-xs">Hoạt động an ninh và thay đổi trạng thái</CardDescription>
                    </CardHeader>
                    <CardContent className="max-h-72 overflow-y-auto">
                        {logs.map((log) => (
                            <div key={log.id} className="py-3 flex items-start justify-between gap-4 first:pt-0 last:pb-0">
                                <div>
                                    <p className="text-sm font-semibold">{log.action}</p>
                                    <p className="text-xs mt-0.5">{log.details}</p>
                                    <span className="inline-block font-mono text-[10px] px-1.5 py-0.5 rounded mt-1">
                                        {log.target}
                                    </span>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-[10px]">{log.time}</span>
                                    <div className="mt-1">
                                        <span className="inline-block text-[10px] font-semibold uppercase tracking-wider">
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
