import { useState } from 'react';
import { PageHeader, PageCard, EmptyState, ConfirmDialog, TablePagination } from '@/components';
import { Button } from '@/components/ui/button';
import { Laptop, Smartphone, LogOut, Clock, ShieldAlert, Loader2 } from 'lucide-react';
import { useSessions } from '../hooks/useSessions';
import type { ActiveSession } from '../hooks/useSessions';

const parseUserAgent = (uaString?: string) => {
    const ua = (uaString || '').toLowerCase();
    let os = 'Hệ điều hành khác';
    let browser = 'Trình duyệt khác';
    let isMobile = false;

    // Detect OS
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('macintosh') || ua.includes('mac os x')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) {
        os = 'Android';
        isMobile = true;
    } else if (ua.includes('iphone') || ua.includes('ipad')) {
        os = 'iOS';
        isMobile = true;
    }

    // Detect Browser
    if (ua.includes('chrome') || ua.includes('crios')) browser = 'Google Chrome';
    else if (ua.includes('firefox') || ua.includes('fxios')) browser = 'Mozilla Firefox';
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Apple Safari';
    else if (ua.includes('edge') || ua.includes('edg')) browser = 'Microsoft Edge';

    return { os, browser, isMobile };
};

export const SessionsManagement = () => {
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const {
        sessions,
        meta,
        isLoading,
        revokeSession,
        revokeAllSessions,
        isRevokingAll,
    } = useSessions({ page: currentPage, limit: pageSize });

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Đang tải danh sách phiên hoạt động...</span>
            </div>
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
                {sessions.length > 1 && (
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
                                        <ShieldAlert className="h-4 w-4 mr-1.5" /> Hủy tất cả phiên khác
                                    </>
                                )}
                            </Button>
                        }
                        title="Hủy toàn bộ các phiên đăng nhập khác?"
                        description="Hành động này sẽ xóa toàn bộ Refresh Token của tài khoản ngoại trừ phiên làm việc hiện tại của bạn trên trình duyệt này."
                        confirmText="Xác nhận đăng xuất toàn bộ"
                        variant="destructive"
                        onConfirm={() => revokeAllSessions()}
                    />
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
                                const { os, browser, isMobile } = parseUserAgent(session.userAgent);
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
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1 font-mono bg-muted/50 px-1.5 py-0.5 rounded border border-border/40">
                                                        IP: {session.ip}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        Đăng nhập: {new Date(session.createdAt).toLocaleString('vi-VN')}
                                                    </span>
                                                </div>
                                                <div className="text-[10px] text-muted-foreground/60 font-mono">
                                                    JTI: {session.jti}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center shrink-0 self-end sm:self-center">
                                            <ConfirmDialog
                                                trigger={
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                                                    >
                                                        <LogOut className="h-4 w-4 mr-1.5" /> Đăng xuất thiết bị
                                                    </Button>
                                                }
                                                title="Đăng xuất thiết bị này?"
                                                description={`Phiên đăng nhập tại địa chỉ IP ${session.ip} sử dụng trình duyệt ${browser} sẽ lập tức bị thu hồi.`}
                                                confirmText="Đăng xuất thiết bị"
                                                variant="destructive"
                                                onConfirm={() => revokeSession(session.jti)}
                                            />
                                        </div>
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
