import { useDashboardStats } from "../hooks/useDashboardStats";
import { useSystemHealth } from "../hooks/useSystemHealth";
import { DashboardCharts } from "./DashboardCharts";
import { useAuditLogs } from "@/features/audit";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Users,
  Activity,
  Database,
  Cpu,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QueryErrorState } from "@/components";

type InfrastructureStatus = "checking" | "up" | "down" | "unknown";

const InfraBadge = ({ status }: { status: InfrastructureStatus }) => {
  if (status === "checking") {
    return (
      <Badge variant="secondary" className="text-xs">
        Đang kiểm tra…
      </Badge>
    );
  }
  if (status === "unknown") {
    return (
      <Badge
        variant="outline"
        className="flex items-center gap-1 border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
      >
        <AlertTriangle className="h-3 w-3" /> Không xác định
      </Badge>
    );
  }
  return status === "up" ? (
    <Badge
      variant="outline"
      className="flex items-center gap-1 border-emerald-500/20 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400"
    >
      <CheckCircle2 className="h-3 w-3" /> Healthy
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="flex items-center gap-1 border-destructive/20 bg-destructive/10 text-destructive"
    >
      <XCircle className="h-3 w-3" /> Down
    </Badge>
  );
};

export const DashboardOverview = () => {
  const {
    stats,
    isLoading,
    isError,
    error,
    refetch: refetchStats,
    isFetching: isStatsFetching,
  } = useDashboardStats();
  const {
    health,
    isLoading: isHealthLoading,
    isError: isHealthError,
    refetch: refetchHealth,
    isFetching: isHealthFetching,
  } = useSystemHealth();
  const {
    logs: auditLogs,
    isLoading: isAuditLoading,
    isError: isAuditError,
    error: auditError,
    refetch: refetchAudit,
    isFetching: isAuditFetching,
  } = useAuditLogs({ page: 1, limit: 5 });

  const getInfrastructureStatus = (
    service: "database" | "redis",
  ): InfrastructureStatus => {
    if (isHealthLoading) return "checking";
    if (isHealthError || !health) return "unknown";
    return health.checks[service];
  };

  const databaseStatus = getInfrastructureStatus("database");
  const redisStatus = getInfrastructureStatus("redis");
  const isRefreshing = isStatsFetching || isHealthFetching || isAuditFetching;
  const refreshDashboard = () => {
    void Promise.all([refetchStats(), refetchHealth(), refetchAudit()]);
  };

  if (isLoading) {
    return (
      <div
        className="flex h-96 items-center justify-center gap-2 text-sm text-muted-foreground"
        role="status"
        aria-label="Đang tải tổng quan hệ thống"
      >
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span>Đang tải thông số hệ thống...</span>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <QueryErrorState
        error={error}
        onRetry={() => void refetchStats()}
        isRetrying={isStatsFetching}
        className="min-h-96"
        title="Không thể tải tổng quan hệ thống"
      />
    );
  }

  const metrics = [
    {
      title: "Tổng số Users",
      value: stats.totalUsers,
      description: `${stats.activeUsers} đang hoạt động, ${stats.inactiveUsers} đã khóa`,
      icon: Users,
    },
    {
      title: "Phiên hoạt động (Redis)",
      value: stats.activeSessionsCount,
      description: "Tổng số thiết bị/trình duyệt đang kết nối",
      icon: Activity,
    },
    {
      title: "Cơ sở dữ liệu (PostgreSQL)",
      value:
        databaseStatus === "checking"
          ? "…"
          : databaseStatus === "up"
            ? "Online"
            : databaseStatus === "down"
              ? "Offline"
              : "Unknown",
      description: "Đo trực tiếp từ /health/ready, làm mới mỗi 30 giây",
      icon: Database,
    },
    {
      title: "Hạ tầng Redis Cache",
      value:
        redisStatus === "checking"
          ? "…"
          : redisStatus === "up"
            ? "Connected"
            : redisStatus === "down"
              ? "Down"
              : "Unknown",
      description: "Đo trực tiếp từ /health/ready, làm mới mỗi 30 giây",
      icon: Cpu,
    },
  ];

  return (
    <div className="space-y-6 bg-background text-foreground">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Tổng quan hệ thống
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Theo dõi hoạt động hạ tầng và người dùng thời gian thực
          </p>
        </div>
        <Button
          onClick={refreshDashboard}
          disabled={isRefreshing}
          title="Tải lại dữ liệu"
          variant="outline"
          size="sm"
          className="self-start sm:self-auto"
        >
          <RefreshCw
            className={`mr-1.5 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          {isRefreshing ? "Đang tải lại" : "Tải lại"}
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card
              key={metric.title}
              className="border-border/60 shadow-xs hover:border-primary/20 transition-all duration-200"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {metric.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground/80" />
              </CardHeader>
              <CardContent className="pt-1">
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {metric.value}
                </div>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  {metric.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <DashboardCharts stats={stats} />
      {/* Detail Layout */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Tech Stack Stats */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base font-bold text-foreground">
              Trạng thái hạ tầng
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Các cấu phần lõi của Monorepo Starter
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/10">
              <div className="flex items-center gap-3">
                <Database className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Database Engine
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Prisma ORM + PostgreSQL
                  </p>
                </div>
              </div>
              <InfraBadge status={databaseStatus} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/10">
              <div className="flex items-center gap-3">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    In-Memory Cache & Session
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    IORedis Service Connection
                  </p>
                </div>
              </div>
              <InfraBadge status={redisStatus} />
            </div>
          </CardContent>
        </Card>

        {/* Nhật ký audit thật — cùng nguồn với trang /audit-logs */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base font-bold text-foreground">
              Nhật ký hệ thống gần đây
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              5 hành động quản trị mới nhất từ audit trail
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-72 overflow-y-auto space-y-4">
            {isAuditLoading ? (
              <div
                className="flex items-center gap-2 text-xs text-muted-foreground"
                role="status"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Đang tải nhật ký…
              </div>
            ) : isAuditError ? (
              <QueryErrorState
                error={auditError}
                onRetry={() => void refetchAudit()}
                isRetrying={isAuditFetching}
                title="Không thể tải nhật ký gần đây"
                className="min-h-52"
              />
            ) : auditLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Chưa có hoạt động quản trị nào được ghi nhận.
              </p>
            ) : (
              auditLogs.map((log, index) => (
                <div
                  key={log.id}
                  className={`flex items-start justify-between gap-4 pb-3 ${index !== auditLogs.length - 1 ? "border-b border-border" : ""}`}
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {log.action}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {log.details}
                    </p>
                    <span className="inline-block font-mono text-[9px] text-muted-foreground px-1.5 py-0.5 rounded mt-1 bg-muted border border-border">
                      {log.userEmail ?? "hệ thống"}
                      {log.ip ? ` · ${log.ip}` : ""}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(log.createdAt), {
                        addSuffix: true,
                        locale: vi,
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
