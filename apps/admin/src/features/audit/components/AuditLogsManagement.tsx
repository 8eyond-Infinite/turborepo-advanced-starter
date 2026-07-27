import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  EmptyState,
  PageCard,
  PageHeader,
  QueryErrorState,
  TablePagination,
  Timeline,
} from "@/components";
import { Loader2 } from "lucide-react";
import type { TimelineItem } from "@/components/timeline";
import { useAuditLogs } from "../hooks/useAuditLogs";
import { AuditLogDetails } from "./AuditLogDetails";
import { AuditSearchInput } from "./AuditSearchInput";
import {
  formatAuditTimestamp,
  getAuditActionMeta,
} from "./audit-log.presentation";

export const AuditLogsManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get("q") ?? "";
  const parsedPage = Number(searchParams.get("page"));
  const currentPage =
    Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const { logs, meta, isLoading, isError, error, refetch, isFetching } =
    useAuditLogs({
      page: currentPage,
      limit: 10,
      search: urlSearch,
    });

  const handleSearch = useCallback(
    (nextSearch: string) => {
      if (nextSearch === urlSearch) return;
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (nextSearch) next.set("q", nextSearch);
          else next.delete("q");
          next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams, urlSearch],
  );

  const setCurrentPage = (page: number) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (page <= 1) next.delete("page");
      else next.set("page", String(page));
      return next;
    });
  };

  const timelineItems: TimelineItem[] = logs.map((log) => {
    const actionMeta = getAuditActionMeta(log.action);
    return {
      id: log.id,
      title: actionMeta.label,
      icon: actionMeta.icon,
      type: actionMeta.type,
      timestamp: formatAuditTimestamp(log.createdAt),
      dateTime: log.createdAt,
      description: <AuditLogDetails log={log} />,
    };
  });

  return (
    <div className="space-y-6 bg-background text-foreground">
      <PageHeader
        title="Nhật ký hoạt động (Audit Logs)"
        description="Ghi lại toàn bộ hành động quản trị, bảo mật và thay đổi cấu hình trên hệ thống."
      />

      <PageCard
        title="Dòng thời gian sự kiện"
        description={`Hiển thị danh sách log sự kiện. Tổng số bản ghi: ${meta.totalItems}`}
        actions={
          <div className="w-full sm:w-80">
            <AuditSearchInput
              key={urlSearch}
              initialValue={urlSearch}
              onSearch={handleSearch}
            />
          </div>
        }
      >
        {isLoading ? (
          <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Đang tải nhật ký hệ thống...</span>
          </div>
        ) : isError ? (
          <div className="p-6">
            <QueryErrorState
              error={error}
              onRetry={() => void refetch()}
              isRetrying={isFetching}
            />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="Không tìm thấy nhật ký hoạt động nào"
              description={
                urlSearch
                  ? "Thử tìm kiếm với từ khóa khác."
                  : "Hệ thống chưa ghi nhận hoạt động quản trị nào."
              }
            />
          </div>
        ) : (
          <div className="space-y-6 p-6 md:p-8">
            <Timeline items={timelineItems} />
            <div className="border-t border-border/50 pt-4">
              <TablePagination
                currentPage={meta.currentPage}
                totalPages={meta.totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        )}
      </PageCard>
    </div>
  );
};
