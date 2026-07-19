import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { ConfirmDialog, PageHeader, SearchInput, EmptyState, PageCard, TablePagination } from '@/components';
import { UserCheck, UserX, UserPlus, Shield, Loader2, Pencil } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUsers } from '../hooks/useUsers';
import { AddUserCard } from './AddUserCard';
import { EditUserModal } from './EditUserModal';

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
        <div className="space-y-6">
            {/* Header section */}
            <PageHeader
                title="Quản lý Người dùng"
                description="Quản lý danh sách thành viên, cấp vai trò và khóa/xóa tài khoản truy cập."
            >
                <Button
                    onClick={() => setIsAdding(!isAdding)}
                    variant="outline"
                    size="sm"
                    className="cursor-pointer shrink-0"
                >
                    <UserPlus className="h-4 w-4 mr-1.5" /> Thêm người dùng mới
                </Button>
            </PageHeader>

            {/* Create User Form */}
            {isAdding && (
                <AddUserCard
                    onClose={() => setIsAdding(false)}
                    onCreateUser={createUser}
                    isCreating={isCreating}
                    roles={roles}
                />
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
                            <TableHead className="w-[20%] text-right pr-6">Thao tác</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                        <span className="text-xs">Đang tải danh sách tài khoản...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-48 text-center">
                                    <EmptyState
                                        title={debouncedSearch ? "Không tìm thấy kết quả" : "Chưa có tài khoản nào"}
                                        description={
                                            debouncedSearch
                                                ? `Không có tài khoản nào trùng khớp với từ khóa "${debouncedSearch}".`
                                                : "Hệ thống chưa có tài khoản người dùng nào được tạo."
                                        }
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => (
                                <TableRow key={user.id} className="hover:bg-muted/5 transition-colors">
                                    <TableCell className="font-semibold text-foreground pl-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8 rounded-full">
                                                <AvatarImage src={getAvatarUrl(user.avatar)} />
                                                <AvatarFallback className="rounded-full text-[10px] bg-muted text-muted-foreground font-bold">
                                                    {(user.username || user.email).substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-sm font-medium">{user.username || '—'}</span>
                                                <span className="text-xs text-muted-foreground font-normal">{user.email}</span>
                                                <span className="font-mono text-[9px] text-muted-foreground tracking-tight select-none">
                                                    {user.id}
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {user.roles && user.roles.length > 0 ? (
                                                user.roles.map((r: string) => {
                                                    const isAdmin = r === 'ADMIN';
                                                    const isUser = r === 'USER';
                                                    return (
                                                        <Badge
                                                            key={r}
                                                            variant="outline"
                                                            className={`text-[9px] py-0.5 px-1.5 uppercase font-mono tracking-wider border ${isAdmin
                                                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 dark:border-amber-500/30'
                                                                : isUser
                                                                    ? 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400 dark:border-blue-500/30'
                                                                    : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
                                                                }`}
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
                                            <Switch
                                                checked={user.isActive}
                                                onCheckedChange={() => setTogglingUser(user)}
                                                className="cursor-pointer data-[state=checked]:bg-emerald-500"
                                            />
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
                                    <TableCell className="text-right pr-6">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                                                onClick={() => setEditingUser(user)}
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>

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
                                        </div>
                                    </TableCell>
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

            {/* Edit User Modal Overlay */}
            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                    onUpdateUser={updateUser}
                    isUpdating={isUpdating}
                    roles={roles}
                />
            )}
        </div>
    );
};
