import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { SingleSelect } from '@/components/single-select';
import { UserCheck, UserX, Search, UserPlus, Trash2, Shield, Loader2 } from 'lucide-react';
import { useUsers } from '../hooks/useUsers';

export const UserTable = () => {
    const {
        users,
        roles,
        createUser,
        toggleStatus,
        deleteUser,
        isLoading,
        isCreating,
    } = useUsers();

    const [searchQuery, setSearchQuery] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [selectedRoleName, setSelectedRoleName] = useState<string>('USER');
    const [togglingUser, setTogglingUser] = useState<any | null>(null);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail.trim() || !newPassword.trim()) return;

        try {
            await createUser({
                email: newEmail.trim(),
                password: newPassword.trim(),
                roles: [selectedRoleName],
            });
            setNewEmail('');
            setNewPassword('');
            setSelectedRoleName('USER');
            setIsAdding(false);
        } catch (error) {
            // Error toasts are handled inside the hook
        }
    };

    // Filter users by search query
    const filteredUsers = users.filter((user) =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Đang tải danh sách người dùng...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 bg-background text-foreground">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        Quản lý Người dùng
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Quản lý danh sách thành viên, cấp vai trò và khóa/xóa tài khoản truy cập.
                    </p>
                </div>
                <Button
                    onClick={() => setIsAdding(!isAdding)}
                    variant="outline"
                    size="sm"
                    className="cursor-pointer shrink-0"
                >
                    <UserPlus className="h-4 w-4 mr-1.5" /> Thêm người dùng mới
                </Button>
            </div>

            {/* Create User Form */}
            {isAdding && (
                <Card className="border-border bg-card p-5 max-w-xl transition-all">
                    <CardHeader className="p-0 pb-4">
                        <CardTitle className="text-sm font-bold">Tạo tài khoản Người dùng</CardTitle>
                        <CardDescription className="text-xs">
                            Đăng ký tài khoản người dùng trực tiếp và gán vai trò tương ứng trên hệ thống.
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="text-xs font-semibold text-muted-foreground">Địa chỉ Email</label>
                                <Input
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    placeholder="user@example.com"
                                    className="mt-1 bg-transparent border-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-muted-foreground">Mật khẩu khởi tạo</label>
                                <Input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="mt-1 bg-transparent border-input"
                                    required
                                />
                            </div>
                        </div>

                        {/* Roles Selection */}
                        <div className="space-y-2 max-w-xs">
                            <label className="text-xs font-semibold text-muted-foreground block">
                                Gán vai trò (Role)
                            </label>
                            <SingleSelect
                                value={selectedRoleName}
                                onChange={setSelectedRoleName}
                                options={roles.map((r) => ({ value: r.name, label: r.name }))}
                                placeholder="Chọn vai trò..."
                                label="Danh sách vai trò"
                            />
                        </div>

                        <div className="flex gap-2 justify-end pt-2 border-t border-border">
                            <Button
                                type="button"
                                onClick={() => setIsAdding(false)}
                                variant="ghost"
                                size="sm"
                                className="cursor-pointer"
                            >
                                Hủy
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                className="cursor-pointer"
                                disabled={isCreating}
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                                        Đang tạo...
                                    </>
                                ) : (
                                    'Tạo tài khoản'
                                )}
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Filter Actions */}
            <div className="flex items-center max-w-sm relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm người dùng theo email..."
                    className="pl-9 bg-transparent border-input"
                />
            </div>

            {/* Users Table */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead className="text-xs font-semibold uppercase pl-6 w-[200px]">Email</TableHead>
                            <TableHead className="text-xs font-semibold uppercase min-w-[150px]">Vai trò</TableHead>
                            <TableHead className="text-xs font-semibold uppercase w-[150px]">Trạng thái</TableHead>
                            <TableHead className="text-xs font-semibold uppercase w-[150px]">Ngày Tạo</TableHead>
                            <TableHead className="text-center text-xs font-semibold uppercase w-[120px]">Kích hoạt</TableHead>
                            <TableHead className="text-center text-xs font-semibold uppercase w-[80px] pr-6">Thao tác</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                                    {searchQuery ? 'Không tìm thấy người dùng nào khớp từ khóa.' : 'Không có người dùng nào trên hệ thống.'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map((user) => (
                                <TableRow key={user.id} className="hover:bg-muted/5 transition-colors">
                                    <TableCell className="font-semibold text-foreground pl-6 py-4">
                                        <div className="flex flex-col gap-0.5">
                                            <span>{user.email}</span>
                                            <span className="font-mono text-[9px] text-muted-foreground tracking-tight select-none">
                                                {user.id}
                                            </span>
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
                                                            className={`text-[9px] py-0.5 px-1.5 uppercase font-mono tracking-wider border ${
                                                                isAdmin
                                                                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 dark:border-amber-500/30'
                                                                    : isUser
                                                                    ? 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20 dark:text-zinc-400 dark:border-zinc-500/30'
                                                                    : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/30'
                                                            }`}
                                                        >
                                                            <Shield className="h-2.5 w-2.5 mr-0.5 inline-block" /> {r}
                                                        </Badge>
                                                    );
                                                })
                                            ) : (
                                                <span className="text-xs text-muted-foreground">Chưa gán vai trò</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {user.isActive ? (
                                            <Badge variant="outline" className="flex items-center gap-1 w-fit bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/5 dark:text-emerald-400 dark:border-emerald-500/30">
                                                <UserCheck className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                                Đang hoạt động
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="flex items-center gap-1 w-fit bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/5 dark:text-red-400 dark:border-red-500/30">
                                                <UserX className="h-3 w-3 shrink-0 text-red-600 dark:text-red-400" />
                                                Đã khóa
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {new Date(user.createdAt).toLocaleDateString('vi-VN', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                        })}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex justify-center">
                                            <Switch
                                                checked={user.isActive}
                                                onCheckedChange={() => setTogglingUser(user)}
                                                className="cursor-pointer"
                                            />

                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center pr-6">
                                        <div className="flex justify-center">
                                            <ConfirmDialog
                                                trigger={
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded cursor-pointer transition-colors"
                                                        title="Xóa người dùng"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                }
                                                title="Bạn có chắc chắn muốn xóa tài khoản này?"
                                                description={
                                                    <span>
                                                        Hành động này sẽ thực hiện <strong>Xóa mềm (Soft-delete)</strong> tài khoản <strong>{user.email}</strong> khỏi hệ thống và ngăn cản mọi kết nối trong tương lai.
                                                    </span>
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
            </div>

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
        </div>
    );
};
