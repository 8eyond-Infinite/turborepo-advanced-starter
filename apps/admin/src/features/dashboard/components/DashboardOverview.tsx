import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Users, Activity, Database, Cpu, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const DashboardOverview = () => {
    // 1. Query users to show total users count
    const { data: users = [], isLoading, refetch, isFetching } = useQuery<any[]>({
        queryKey: ['users'],
        queryFn: async () => {
            return await ApiClient.get<any[]>('/users');
        },
        staleTime: 60000,
    });

    const userList = Array.isArray(users) ? users : ((users as any).data || []);
    const totalUsers = Array.isArray(users) ? users.length : ((users as any).meta?.totalItems || 0);
    const activeUsers = userList.filter((u: any) => u.isActive).length;
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
        <div className="space-y-6 bg-background text-foreground">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-foreground">Tổng quan hệ thống</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">Theo dõi hoạt động hạ tầng và người dùng thời gian thực</p>
                </div>
                <Button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    title="Tải lại dữ liệu"
                    variant="outline"
                    size="sm"
                >
                    <RefreshCw className={`h-4 w-4 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
                    Tải lại
                </Button>
            </div>

            {/* Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={stat.title}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle>
                                    {stat.title}
                                </CardTitle>
                                <Icon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent className="pt-1">
                                <div className="text-2xl font-bold tracking-tight text-foreground">{stat.value}</div>
                                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Detail Layout */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Tech Stack Stats */}
                <Card className="border-border bg-card">
                    <CardHeader>
                        <CardTitle className="text-base font-bold text-foreground">Trạng thái hạ tầng</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">Các cấu phần lõi của Monorepo Starter</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/10">
                            <div className="flex items-center gap-3">
                                <Database className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-semibold text-foreground">Database Engine</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Prisma ORM + PostgreSQL</p>
                                </div>
                            </div>
                            <Badge variant="outline" className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-primary" /> Healthy
                            </Badge>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/10">
                            <div className="flex items-center gap-3">
                                <Cpu className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-semibold text-foreground">In-Memory Cache & Session</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">IORedis Service Connection</p>
                                </div>
                            </div>
                            <Badge variant="outline" className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-primary" /> Active
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Audit Simulation Logs */}
                <Card className="border-border bg-card">
                    <CardHeader>
                        <CardTitle className="text-base font-bold text-foreground">Nhật ký hệ thống gần đây</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">Hoạt động an ninh và thay đổi trạng thái</CardDescription>
                    </CardHeader>
                    <CardContent className="max-h-72 overflow-y-auto space-y-4">
                        {logs.map((log, index) => (
                            <div key={log.id} className={`flex items-start justify-between gap-4 pb-3 ${index !== logs.length - 1 ? 'border-b border-border' : ''}`}>
                                <div>
                                    <p className="text-sm font-semibold text-foreground">{log.action}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>
                                    <span className="inline-block font-mono text-[9px] text-muted-foreground px-1.5 py-0.5 rounded mt-1 bg-muted border border-border">
                                        {log.target}
                                    </span>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-[10px] text-muted-foreground">{log.time}</span>
                                    <div className="mt-1">
                                        <Badge variant="secondary" className="text-[9px] uppercase tracking-wider">
                                            {log.status}
                                        </Badge>
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
