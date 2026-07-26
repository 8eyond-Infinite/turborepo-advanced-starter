import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
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
  Legend,
} from "recharts";
import type { DashboardStats } from "../api/dashboard.api";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export const DashboardCharts = ({ stats }: { stats: DashboardStats }) => (
  <>
    <div className="grid gap-6 md:grid-cols-3">
      <Card className="md:col-span-2 border-border/60 shadow-xs">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-foreground">
            Tăng trưởng người dùng mới
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Số lượng tài khoản đăng ký mới trong 7 ngày gần nhất
          </CardDescription>
        </CardHeader>
        <CardContent className="h-72 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={stats.userRegistrationTrend}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#27272a"
              />
              <XAxis
                dataKey="date"
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(str) => {
                  try {
                    const parts = str.split("-");
                    return `${parts[2]}/${parts[1]}`;
                  } catch {
                    return str;
                  }
                }}
              />
              <YAxis
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  borderColor: "#27272a",
                  borderRadius: "8px",
                  fontSize: "11px",
                  color: "#fafafa",
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                name="Đăng ký mới"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCount)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Roles Distribution Pie Chart (1/3 width) */}
      <Card className="border-border/60 shadow-xs">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-foreground">
            Cơ cấu vai trò (Roles)
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Tỷ lệ phân phối vai trò người dùng trong hệ thống
          </CardDescription>
        </CardHeader>
        <CardContent className="h-72 flex items-center justify-center pt-2">
          {stats.rolesDistribution.every((r) => r.count === 0) ? (
            <div className="text-xs text-muted-foreground">
              Chưa có dữ liệu phân bổ vai trò.
            </div>
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
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    borderColor: "#27272a",
                    borderRadius: "8px",
                    fontSize: "11px",
                    color: "#fafafa",
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  </>
);
