import { useState, useEffect } from 'react';
import { PageHeader, PageCard, SearchInput, TablePagination, Timeline, EmptyState } from '@/components';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { UserPlus, Pencil, Shield, Trash2, LogOut, ShieldAlert, HelpCircle, Loader2 } from 'lucide-react';
import type { TimelineItem } from '@/components/timeline';
import type { AuditLog } from '@repo/types';

const actionMetaMap: Record<string, { icon: any; type: 'info' | 'success' | 'warning' | 'error' | 'neutral' }> = {
    USER_CREATE: { icon: UserPlus, type: 'success' },
    USER_UPDATE: { icon: Pencil, type: 'info' },
    USER_TOGGLE_STATUS: { icon: Pencil, type: 'warning' },
    USER_DELETE: { icon: Trash2, type: 'error' },
    SESSION_REVOKE: { icon: LogOut, type: 'error' },
    SESSION_REVOKE_ALL: { icon: ShieldAlert, type: 'error' },
    ROLE_CREATE: { icon: Shield, type: 'success' },
    ROLE_UPDATE_PERMISSIONS: { icon: Shield, type: 'info' },
    ROLE_DELETE: { icon: Shield, type: 'error' },
};

export const AuditLogsManagement = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const { logs, meta, isLoading } = useAuditLogs({
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch,
    });

    const formatTimestamp = (isoString: string) => {
        try {
            return new Date(isoString).toLocaleString('vi-VN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });
        } catch {
            return isoString;
        }
    };

    // Transform API audit logs to TimelineItem elements
    const timelineItems: TimelineItem[] = logs.map((log: AuditLog) => {
        const metaInfo = actionMetaMap[log.action] || { icon: HelpCircle, type: 'neutral' };

        return {
            id: log.id,
            title: `${log.action.replace(/_/g, ' ')}`,
            icon: metaInfo.icon,
            type: metaInfo.type,
            timestamp: formatTimestamp(log.createdAt),
            description: (
                <div className="space-y-1.5 mt-1 text-[11px] text-muted-foreground">
                    <p className="text-foreground/95 font-medium text-xs bg-muted/30 p-2.5 rounded-lg border border-border/40 leading-relaxed max-w-2xl">
                        {log.details}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] pl-0.5">
                        <span>Thực hiện bởi: <strong className="text-foreground/80 font-semibold">{log.userEmail || 'Hệ thống'}</strong></span>
                        <span className="text-muted-foreground/40">•</span>
                        <span>IP: {log.ip || 'Unknown'}</span>
                        <span className="text-muted-foreground/40">•</span>
                        <span className="truncate max-w-xs" title={log.userAgent || ''}>Thiết bị: {log.userAgent || 'Unknown'}</span>
                    </div>
                </div>
            ),
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
                    <div className="w-72">
                        <SearchInput
                            placeholder="Tìm kiếm hành động, chi tiết..."
                            value={searchQuery}
                            onChange={setSearchQuery}
                        />
                    </div>
                }
            >
                {isLoading ? (
                    <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Đang tải nhật ký hệ thống...</span>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="p-12">
                        <EmptyState
                            title="Không tìm thấy nhật ký hoạt động nào"
                            description={debouncedSearch ? "Thử tìm kiếm với từ khóa khác." : "Hệ thống chưa ghi nhận hoạt động quản trị nào."}
                        />
                    </div>
                ) : (
                    <div className="p-6 md:p-8 space-y-6">
                        <Timeline items={timelineItems} />

                        <div className="pt-4 border-t border-border/50">
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
