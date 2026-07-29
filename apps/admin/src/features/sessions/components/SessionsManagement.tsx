import { useSearchParams } from "react-router-dom";
import {
  PageHeader,
  PageCard,
  EmptyState,
  ConfirmDialog,
  TablePagination,
  QueryErrorState,
} from "@/components";
import { Button } from "@/components/ui/button";
import {
  Laptop,
  Smartphone,
  LogOut,
  Clock,
  ShieldAlert,
  Loader2,
  BadgeCheck,
} from "lucide-react";
import { useSessions } from "../hooks/useSessions";
import type { ActiveSession } from "@repo/types";
import { Can, usePermissions } from "@/app/access/usePermission";
import { PERMISSIONS } from "@repo/contracts";

const parseUserAgent = (uaString?: string) => {
  const ua = (uaString || "").toLowerCase();
  let os = "Hệ điều hành khác";
  let browser = "Trình duyệt khác";
  let isMobile = false;

  // Detect OS
  if (ua.includes("android")) {
    os = "Android";
    isMobile = true;
  } else if (ua.includes("iphone") || ua.includes("ipad")) {
    os = "iOS";
    isMobile = true;
  } else if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("macintosh") || ua.includes("mac os x")) os = "macOS";
  else if (ua.includes("linux")) os = "Linux";

  if (ua.includes("edge") || ua.includes("edg")) browser = "Microsoft Edge";
  else if (ua.includes("chrome") || ua.includes("crios"))
    browser = "Google Chrome";
  else if (ua.includes("firefox") || ua.includes("fxios"))
    browser = "Mozilla Firefox";
  else if (ua.includes("safari") && !ua.includes("chrome"))
    browser = "Apple Safari";

  return { os, browser, isMobile };
};

export const SessionsManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const parsedPage = Number(searchParams.get("page"));
  const currentPage =
    Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const pageSize = 10;

  const {
    sessions,
    meta,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    revokeSession,
    revokeAllSessions,
    isRevoking,
    revokingSessionId,
    isRevokingAll,
  } = useSessions({ page: currentPage, limit: pageSize });

  const access = usePermissions({
    canRevokeSessions: PERMISSIONS.SESSION.DELETE,
  });

  const setCurrentPage = (page: number) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (page <= 1) next.delete("page");
      else next.set("page", String(page));
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Đang tải danh sách phiên hoạt động...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <QueryErrorState
        error={error}
        onRetry={() => void refetch()}
        isRetrying={isFetching}
        className="min-h-64"
      />
    );
  }

  const totalPages = meta.totalPages;
  const safeCurrentPage = meta.currentPage;

  return (
    <div className="space-y-6 bg-background text-foreground">
      <PageHeader
        title="Quản lý Phiên đăng nhập"
        description="Xem các thiết bị và trình duyệt đang kết nối vào tài khoản của bạn, thu hồi quyền truy cập khi phát hiện bất thường."
      >
        {meta.totalItems > 1 && (
          <Can I={PERMISSIONS.SESSION.DELETE}>
            <ConfirmDialog
              trigger={
                <Button
                  variant="destructive"
                  size="sm"
                  className="cursor-pointer font-medium"
                  disabled={isRevokingAll}
                >
                  {isRevokingAll ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="h-4 w-4 mr-1.5" /> Hủy tất cả
                      phiên khác
                    </>
                  )}
                </Button>
              }
              title="Hủy toàn bộ các phiên đăng nhập khác?"
              description="Hành động này sẽ thu hồi ngay quyền truy cập của mọi thiết bị khác, nhưng giữ nguyên phiên đang dùng trên trình duyệt này."
              confirmText="Xác nhận đăng xuất toàn bộ"
              pendingText="Đang thu hồi..."
              variant="destructive"
              onConfirm={() => revokeAllSessions()}
            />
          </Can>
        )}
      </PageHeader>

      <PageCard
        title="Thiết bị đang hoạt động"
        description={`Hệ thống ghi nhận ${meta.totalItems} phiên kết nối hợp lệ.`}
      >
        {sessions.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Không có phiên nào đang hoạt động"
              description="Tài khoản của bạn hiện không có phiên kết nối hợp lệ nào."
            />
          </div>
        ) : (
          <>
            <div className="divide-y divide-border/40">
              {sessions.map((session: ActiveSession) => {
                const { os, browser, isMobile } = parseUserAgent(
                  session.userAgent,
                );
                const Icon = isMobile ? Smartphone : Laptop;

                return (
                  <div
                    key={session.jti}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-6 gap-4 hover:bg-muted/5 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary border border-primary/10">
                        <Icon className="h-5 w-5 stroke-[1.8]" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {os} • {browser}
                          </span>
                          {session.isCurrent && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              <BadgeCheck className="h-3 w-3" />
                              Phiên hiện tại
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 font-mono bg-muted/50 px-1.5 py-0.5 rounded border border-border/40">
                            IP: {session.ip}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            Đăng nhập:{" "}
                            {new Date(session.createdAt).toLocaleString(
                              "vi-VN",
                            )}
                          </span>
                          {session.absoluteExpiresAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              Hết hạn:{" "}
                              {new Date(
                                session.absoluteExpiresAt,
                              ).toLocaleString("vi-VN")}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground/60 font-mono">
                          JTI: {session.jti}
                        </div>
                      </div>
                    </div>
                    {access.canRevokeSessions && !session.isCurrent && (
                      <div className="flex items-center shrink-0 self-end sm:self-center">
                        <Can I={PERMISSIONS.SESSION.DELETE}>
                          <ConfirmDialog
                            trigger={
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={`Đăng xuất thiết bị tại IP ${session.ip}`}
                                disabled={
                                  isRevoking &&
                                  revokingSessionId === session.jti
                                }
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                              >
                                <LogOut className="h-4 w-4 mr-1.5" /> Đăng xuất
                                thiết bị
                              </Button>
                            }
                            title="Đăng xuất thiết bị này?"
                            description={`Phiên đăng nhập tại địa chỉ IP ${session.ip} sử dụng trình duyệt ${browser} sẽ lập tức bị thu hồi.`}
                            confirmText="Đăng xuất thiết bị"
                            pendingText="Đang đăng xuất..."
                            variant="destructive"
                            onConfirm={() => revokeSession(session.jti)}
                          />
                        </Can>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <TablePagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </PageCard>
    </div>
  );
};
