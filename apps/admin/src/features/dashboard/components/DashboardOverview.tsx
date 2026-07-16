import { useDashboardStats } from '../hooks/useDashboardStats';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Users, Activity, Database, Cpu, CheckCircle2, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    PieChart, 
    Pie, 
    Cell, 
    Legend 
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const DashboardOverview = () => {
    const { stats, isLoading, refetch, isFetching } = useDashboardStats();

    if (isLoading || !stats) {
        return (
            <div className="flex h-96 items-center justify-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span>Đang tải thông số hệ thống...</span>
            </div>
        );
    }

    const metrics = [
        {
            title: 'Tổng số Users',
            value: stats.totalUsers,
            description: `${stats.activeUsers} đang hoạt động, ${stats.inactiveUsers} đã khóa`,
            icon: Users,
        },
        {
            title: 'Phiên hoạt động (Redis)',
            value: stats.activeSessionsCount,
            description: 'Tổng số thiết bị/trình duyệt đang kết nối',
            icon: Activity,
        },
        {
            title: 'Cơ sở dữ liệu (PostgreSQL)',
            value: 'Online',
            description: 'Kết nối qua Prisma ORM',
            icon: Database,
        },
        {
            title: 'Hạ tầng Redis Cache',
            value: 'Connected',
            description: 'Trạng thái in-memory: Tốt',
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
                {metrics.map((metric) => {
                    const Icon = metric.icon;
                    return (
                        <Card key={metric.title} className="border-border/60 shadow-xs hover:border-primary/20 transition-all duration-200">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    {metric.title}
                                </CardTitle>
                                <Icon className="h-4 w-4 text-muted-foreground/80" />
                            </CardHeader>
                            <CardContent className="pt-1">
                                <div className="text-2xl font-bold tracking-tight text-foreground">{metric.value}</div>
                                <p className="text-xs text-muted-foreground/80 mt-1">{metric.description}</p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 md:grid-cols-3">
                {/* Registration Trend Area Chart (2/3 width) */}
                <Card className="md:col-span-2 border-border/60 shadow-xs">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold text-foreground">Tăng trưởng người dùng mới</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">Số lượng tài khoản đăng ký mới trong 7 ngày gần nhất</CardDescription>
                    </CardHeader>
                    <CardContent className="h-72 pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.userRegistrationTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                                <XAxis 
                                    dataKey="date" 
                                    stroke="#71717a" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                    tickFormatter={(str) => {
                                        try {
                                            const parts = str.split('-');
                                            return `${parts[2]}/${parts[1]}`;
                                        } catch {
                                            return str;
                                        }
                                    }}
                                />
                                <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#18181b',
                                        borderColor: '#27272a',
                                        borderRadius: '8px',
                                        fontSize: '11px',
                                        color: '#fafafa',
                                    }}
                                />
                                <Area type="monotone" dataKey="count" name="Đăng ký mới" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Roles Distribution Pie Chart (1/3 width) */}
                <Card className="border-border/60 shadow-xs">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold text-foreground">Cơ cấu vai trò (Roles)</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">Tỷ lệ phân phối vai trò người dùng trong hệ thống</CardDescription>
                    </CardHeader>
                    <CardContent className="h-72 flex items-center justify-center pt-2">
                        {stats.rolesDistribution.every(r => r.count === 0) ? (
                            <div className="text-xs text-muted-foreground">Chưa có dữ liệu phân bổ vai trò.</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.rolesDistribution}
                                        dataKey="count"
                                        nameKey="role"
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={50}
                                        outerRadius={75}
                                        paddingAngle={4}
                                    >
                                        {stats.rolesDistribution.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#18181b',
                                            borderColor: '#27272a',
                                            borderRadius: '8px',
                                            fontSize: '11px',
                                            color: '#fafafa',
                                        }}
                                    />
                                    <Legend 
                                        verticalAlign="bottom" 
                                        height={36} 
                                        iconType="circle"
                                        iconSize={8}
                                        formatter={(value) => <span className="text-[11px] font-medium text-muted-foreground">{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
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
                            <Badge variant="outline" className="flex items-center gap-1 border-emerald-500/20 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" /> Healthy
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
                            <Badge variant="outline" className="flex items-center gap-1 border-emerald-500/20 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" /> Active
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
