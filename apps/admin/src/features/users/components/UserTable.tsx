import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { ConfirmDialog, PageHeader, SearchInput, EmptyState, PageCard, TablePagination } from '@/components';
import { UserCheck, UserX, UserPlus, Shield, Pencil } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUsers } from '../hooks/useUsers';
import { AddUserCard } from './AddUserCard';
import { EditUserModal } from './EditUserModal';
import { Can, usePermissions } from '@/hooks/usePermission';
import { PERMISSIONS } from '@repo/contracts';

const getAvatarUrl = (avatarPath?: string | null) => {
    if (!avatarPath) return undefined;
    if (avatarPath.startsWith('http')) return avatarPath;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    return `${baseUrl}${avatarPath}`;
};

export const UserTable = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isAdding, setIsAdding] = useState(false);
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [togglingUser, setTogglingUser] = useState<any | null>(null);

    // Business capability access map (Domain-driven naming, detached from UI layout)
    const access = usePermissions({
        canManageUsers: [PERMISSIONS.USER.UPDATE, PERMISSIONS.USER.DELETE],
        canCreateUser: PERMISSIONS.USER.CREATE,
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const {
        users,
        meta,
        roles,
        createUser,
        updateUser,
        toggleStatus,
        deleteUser,
        isLoading,
        isCreating,
        isUpdating,
    } = useUsers({ page: currentPage, limit: 10, search: debouncedSearch });

    const totalPages = meta.totalPages;
    const safeCurrentPage = meta.currentPage;

    return (
        <div className="space-y-6 bg-background text-foreground">
            {/* Header section */}
            <PageHeader
                title="Quản lý Người dùng"
                description="Quản lý danh sách thành viên, cấp vai trò và khóa/xóa tài khoản truy cập."
            >
                <Can I={PERMISSIONS.USER.CREATE}>
                    <Button
                        onClick={() => setIsAdding(!isAdding)}
                        variant="outline"
                        size="sm"
                        className="cursor-pointer shrink-0"
                    >
                        <UserPlus className="h-4 w-4 mr-1.5" /> Thêm người dùng mới
                    </Button>
                </Can>
            </PageHeader>

            {/* Create User Form - rendered through <Can> */}
            {isAdding && (
                <Can I={PERMISSIONS.USER.CREATE}>
                    <AddUserCard
                        onClose={() => setIsAdding(false)}
                        onCreateUser={createUser}
                        isCreating={isCreating}
                        roles={roles}
                    />
                </Can>
            )}

            {/* Main Table view */}
            <PageCard className="p-0 border-border overflow-hidden">
                <div className="p-4 border-b border-border/50 bg-muted/5 flex items-center justify-between gap-4">
                    <SearchInput
                        placeholder="Tìm kiếm tài khoản..."
                        value={searchQuery}
                        onChange={setSearchQuery}
                        className="max-w-xs"
                    />
                </div>

                <Table>
                    <TableHeader className="bg-muted/10">
                        <TableRow className="border-border">
                            <TableHead className="w-[30%] pl-6">Thành viên</TableHead>
                            <TableHead className="w-[20%]">Vai trò</TableHead>
                            <TableHead className="w-[15%] text-center">Trạng thái</TableHead>
                            <TableHead className="w-[15%]">Ngày đăng ký</TableHead>
                            {access.canManageUsers && (
                                <TableHead className="w-[20%] text-right pr-6">Thao tác</TableHead>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={access.canManageUsers ? 5 : 4} className="h-48 text-center">
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                        <span>Đang tải danh sách tài khoản...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={access.canManageUsers ? 5 : 4} className="h-48">
                                    <EmptyState
                                        title="Không tìm thấy tài khoản nào"
                                        description={debouncedSearch ? `Không có kết quả khớp với từ khóa "${debouncedSearch}".` : "Chưa có dữ liệu thành viên trên hệ thống."}
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => (
                                <TableRow key={user.id} className="hover:bg-muted/5 border-border transition-colors">
                                    <TableCell className="pl-6 py-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9 border border-border">
                                                <AvatarImage src={getAvatarUrl(user.avatar)} alt={user.username} />
                                                <AvatarFallback className="bg-muted text-foreground text-xs font-semibold uppercase">
                                                    {user.username ? user.username.substring(0, 2) : 'US'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-sm text-foreground">{user.username}</span>
                                                <span className="text-xs text-muted-foreground">{user.email}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {user.roles && user.roles.length > 0 ? (
                                                user.roles.map((r: string) => {
                                                    const isSuperAdmin = r === 'ADMIN';
                                                    return (
                                                        <Badge
                                                            key={r}
                                                            variant="outline"
                                                            className={`text-[10px] py-0 px-2 font-medium ${isSuperAdmin ? 'border-primary/40 text-primary bg-primary/10' : 'border-muted text-muted-foreground'}`}
                                                        >
                                                            <Shield className="h-2 w-2 mr-1 inline-block shrink-0" />
                                                            {r}
                                                        </Badge>
                                                    );
                                                })
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">Không có vai trò</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Can I={PERMISSIONS.USER.UPDATE}>
                                                <Switch
                                                    checked={user.isActive}
                                                    onCheckedChange={() => setTogglingUser(user)}
                                                    className="cursor-pointer data-[state=checked]:bg-emerald-500"
                                                />
                                            </Can>
                                            {user.isActive ? (
                                                <Badge className="bg-emerald-500/10 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] py-0 px-2 font-medium">
                                                    <UserCheck className="h-2.5 w-2.5 mr-1 inline-block" /> Hoạt động
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-red-500/10 hover:bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 text-[10px] py-0 px-2 font-medium">
                                                    <UserX className="h-2.5 w-2.5 mr-1 inline-block" /> Đã khóa
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {new Date(user.createdAt).toLocaleDateString('vi-VN', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                        })}
                                    </TableCell>
                                    {access.canManageUsers && (
                                        <TableCell className="text-right pr-6">
                                            <div className="flex items-center justify-end gap-1">
                                                <Can I={PERMISSIONS.USER.UPDATE}>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                                                        onClick={() => setEditingUser(user)}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                </Can>

                                                <Can I={PERMISSIONS.USER.DELETE}>
                                                    <ConfirmDialog
                                                        title="Xác nhận xóa tài khoản?"
                                                        description={
                                                            <>
                                                                Hành động này <span className="font-bold text-destructive">không thể hoàn tác</span>. Tài khoản <span className="font-semibold text-foreground">{user.email}</span> sẽ bị đánh dấu xóa vĩnh viễn trên cơ sở dữ liệu.
                                                            </>
                                                        }
                                                        confirmText="Xác nhận xóa"
                                                        variant="destructive"
                                                        onConfirm={() => deleteUser(user.id)}
                                                    />
                                                </Can>
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    currentPage={safeCurrentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            </PageCard>

            {/* Controlled Status Toggle Dialog */}
            <ConfirmDialog
                open={!!togglingUser}
                onOpenChange={(open) => {
                    if (!open) setTogglingUser(null);
                }}
                title={togglingUser?.isActive ? "Xác nhận khóa tài khoản?" : "Xác nhận kích hoạt tài khoản?"}
                description={
                    togglingUser?.isActive
                        ? `Tài khoản ${togglingUser.email} sẽ bị hủy kích hoạt và lập tức thu hồi toàn bộ token truy cập đang lưu trữ tại bộ nhớ đệm Redis.`
                        : `Tài khoản ${togglingUser?.email} sẽ được kích hoạt lại và có quyền truy cập trở lại vào hệ thống.`
                }
                confirmText={togglingUser?.isActive ? "Khóa tài khoản" : "Kích hoạt"}
                onConfirm={() => {
                    if (togglingUser) {
                        toggleStatus(togglingUser.id);
                        setTogglingUser(null);
                    }
                }}
            />

            {/* Edit User Modal Overlay - rendered through <Can> */}
            {editingUser && (
                <Can I={PERMISSIONS.USER.UPDATE}>
                    <EditUserModal
                        user={editingUser}
                        onClose={() => setEditingUser(null)}
                        onUpdateUser={updateUser}
                        isUpdating={isUpdating}
                        roles={roles}
                    />
                </Can>
            )}
        </div>
    );
};
