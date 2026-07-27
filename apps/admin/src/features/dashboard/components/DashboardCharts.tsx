import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DashboardStats } from "../api/dashboard.api";

const CHART_WIDTH = 700;
const CHART_HEIGHT = 240;
const CHART_PADDING = 24;

const formatDate = (date: string) => {
  const [, month, day] = date.split("-");
  return month && day ? `${day}/${month}` : date;
};

const getTrendGeometry = (trend: DashboardStats["userRegistrationTrend"]) => {
  const maxCount = Math.max(1, ...trend.map((entry) => entry.count));
  const drawableWidth = CHART_WIDTH - CHART_PADDING * 2;
  const drawableHeight = CHART_HEIGHT - CHART_PADDING * 2;

  const points = trend.map((entry, index) => {
    const x =
      trend.length === 1
        ? CHART_WIDTH / 2
        : CHART_PADDING + (index / (trend.length - 1)) * drawableWidth;
    const y =
      CHART_HEIGHT - CHART_PADDING - (entry.count / maxCount) * drawableHeight;
    return { ...entry, x, y };
  });

  return {
    maxCount,
    points,
    linePath: points
      .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
      .join(" "),
    areaPath:
      points.length === 0
        ? ""
        : `M${points[0].x},${CHART_HEIGHT - CHART_PADDING} ${points
            .map((point) => `L${point.x},${point.y}`)
            .join(" ")} L${points.at(-1)!.x},${CHART_HEIGHT - CHART_PADDING} Z`,
  };
};

const RegistrationTrend = ({
  trend,
}: {
  trend: DashboardStats["userRegistrationTrend"];
}) => {
  const geometry = getTrendGeometry(trend);
  const hasRegistrations = trend.some((entry) => entry.count > 0);

  return (
    <Card className="border-border/60 shadow-xs md:col-span-2">
      <CardHeader>
        <CardTitle className="text-sm font-bold text-foreground">
          Tăng trưởng người dùng mới
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Số lượng tài khoản đăng ký mới trong 7 ngày gần nhất
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasRegistrations ? (
          <div
            className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border/60 text-sm text-muted-foreground"
            role="status"
          >
            Chưa có tài khoản đăng ký trong khoảng thời gian này.
          </div>
        ) : (
          <figure aria-labelledby="registration-trend-caption">
            <svg
              className="h-64 w-full overflow-visible"
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              role="img"
              aria-label={`Biểu đồ đăng ký mới trong 7 ngày, cao nhất ${geometry.maxCount} tài khoản một ngày`}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient
                  id="registration-area"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="var(--primary)"
                    stopOpacity="0.3"
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--primary)"
                    stopOpacity="0.02"
                  />
                </linearGradient>
              </defs>
              {[0, 0.5, 1].map((ratio) => {
                const y =
                  CHART_PADDING + ratio * (CHART_HEIGHT - CHART_PADDING * 2);
                return (
                  <line
                    key={ratio}
                    x1={CHART_PADDING}
                    x2={CHART_WIDTH - CHART_PADDING}
                    y1={y}
                    y2={y}
                    stroke="var(--border)"
                    strokeDasharray="4 5"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
              <path d={geometry.areaPath} fill="url(#registration-area)" />
              <path
                d={geometry.linePath}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
              />
              {geometry.points.map((point) => (
                <circle
                  key={point.date}
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill="var(--background)"
                  stroke="var(--primary)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
            <figcaption
              id="registration-trend-caption"
              className="mt-2 grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground"
            >
              {trend.map((entry) => (
                <span key={entry.date}>
                  <span className="block font-semibold text-foreground">
                    {entry.count}
                  </span>
                  {formatDate(entry.date)}
                </span>
              ))}
            </figcaption>
          </figure>
        )}
      </CardContent>
    </Card>
  );
};

const RolesDistribution = ({
  roles,
}: {
  roles: DashboardStats["rolesDistribution"];
}) => {
  const total = roles.reduce((sum, role) => sum + role.count, 0);

  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader>
        <CardTitle className="text-sm font-bold text-foreground">
          Cơ cấu vai trò
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Phân bổ vai trò trên {total} lượt gán hiện tại
        </CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div
            className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border/60 px-6 text-center text-sm text-muted-foreground"
            role="status"
          >
            Chưa có dữ liệu phân bổ vai trò.
          </div>
        ) : (
          <ul className="flex h-64 flex-col justify-center gap-4">
            {roles.map((role) => {
              const percentage = Math.round((role.count / total) * 100);
              return (
                <li key={role.role} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate font-medium text-foreground">
                      {role.role}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {role.count} · {percentage}%
                    </span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-muted"
                    role="meter"
                    aria-label={`Vai trò ${role.role}`}
                    aria-valuemin={0}
                    aria-valuemax={total}
                    aria-valuenow={role.count}
                    aria-valuetext={`${role.count} lượt gán, ${percentage}%`}
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export const DashboardCharts = ({ stats }: { stats: DashboardStats }) => (
  <section aria-label="Phân tích người dùng">
    <div className="grid gap-6 md:grid-cols-3">
      <RegistrationTrend trend={stats.userRegistrationTrend} />
      <RolesDistribution roles={stats.rolesDistribution} />
    </div>
  </section>
);
