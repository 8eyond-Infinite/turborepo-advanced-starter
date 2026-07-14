import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '@/lib/api-client';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { RefreshCw, UserCheck, UserX, AlertCircle } from 'lucide-react';

export const UserTable = () => {
    const queryClient = useQueryClient();

    const { data: users = [], isLoading, isError, error, refetch, isFetching } = useQuery<any[]>({
        queryKey: ['users'],
        queryFn: async () => {
            return await ApiClient.get<any[]>('/users');
        },
        staleTime: 120000,
    });

    const deactivateMutation = useMutation({
        mutationFn: async (userId: string) => {
            return await ApiClient.patch(`/users/${userId}/deactivate`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });

    const handleToggleActive = (userId: string, currentActive: boolean) => {
        if (currentActive) {
            deactivateMutation.mutate(userId);
        } else {
            alert('Tính năng kích hoạt tài khoản đang được phát triển. Hiện tại backend chỉ hỗ trợ API Deactivate.');
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center text-zinc-500 gap-3">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Đang tải danh sách người dùng...</span>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-red-950/20 border border-red-900/30 rounded-2xl text-red-400 gap-3 max-w-lg mx-auto">
                <AlertCircle className="h-8 w-8" />
                <p className="font-semibold">Lỗi tải dữ liệu</p>
                <p className="text-sm text-zinc-400 text-center">{(error as any).message}</p>
                <Button
                    onClick={() => refetch()}
                    variant="outline"
                    className="mt-2 text-red-400 hover:text-red-300 border-red-900/40 hover:bg-red-950/40"
                >
                    Thử lại
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-zinc-100">Danh sách người dùng</h2>
                    <p className="text-sm text-zinc-500 mt-0.5">Hiển thị toàn bộ tài khoản đăng ký trên hệ thống</p>
                </div>
                <Button
                    onClick={() => refetch()}
                    variant="outline"
                    size="icon"
                    disabled={isFetching}
                >
                    <RefreshCw className={`h-5 w-5 text-zinc-400 ${isFetching ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Users Table */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl overflow-hidden backdrop-blur">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID Người Dùng</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead>Ngày Tạo</TableHead>
                            <TableHead className="text-right">Khóa Tài Khoản</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="py-12 text-center text-zinc-500">
                                    Không có người dùng nào trên hệ thống.
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-mono text-xs text-zinc-500">{user.id}</TableCell>
                                    <TableCell className="font-medium text-zinc-200">{user.email}</TableCell>
                                    <TableCell>
                                        {user.isActive ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                                                <UserCheck className="h-3 w-3" />
                                                Đang hoạt động
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700/50 text-zinc-400 text-xs font-medium">
                                                <UserX className="h-3 w-3" />
                                                Đã khóa
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-zinc-500">
                                        {new Date(user.createdAt).toLocaleDateString('vi-VN', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Switch
                                            checked={user.isActive}
                                            onCheckedChange={() => handleToggleActive(user.id, user.isActive)}
                                            disabled={deactivateMutation.isPending && deactivateMutation.variables === user.id}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};
