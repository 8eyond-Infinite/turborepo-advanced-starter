import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '@/lib/api-client';
import { Switch } from '@/components/ui/switch';
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
                <button
                    onClick={() => refetch()}
                    className="mt-2 bg-red-950/40 hover:bg-red-950/60 border border-red-900/40 px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                >
                    Thử lại
                </button>
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
                <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    title="Tải lại dữ liệu"
                >
                    <RefreshCw className={`h-5 w-5 text-zinc-400 ${isFetching ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Users Table */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl overflow-hidden backdrop-blur">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-zinc-800/80 text-xs font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-900/20">
                                <th className="py-4.5 px-6">ID Người Dùng</th>
                                <th className="py-4.5 px-6">Email</th>
                                <th className="py-4.5 px-6">Trạng thái</th>
                                <th className="py-4.5 px-6">Ngày Tạo</th>
                                <th className="py-4.5 px-6 text-right">Khóa Tài Khoản</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60 text-sm text-zinc-300">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-zinc-500">
                                        Không có người dùng nào trên hệ thống.
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-zinc-900/25 transition-colors">
                                        <td className="py-4 px-6 font-mono text-xs text-zinc-500">{user.id}</td>
                                        <td className="py-4 px-6 font-medium text-zinc-200">{user.email}</td>
                                        <td className="py-4 px-6">
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
                                        </td>
                                        <td className="py-4 px-6 text-zinc-500">
                                            {new Date(user.createdAt).toLocaleDateString('vi-VN', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <Switch
                                                checked={user.isActive}
                                                onCheckedChange={() => handleToggleActive(user.id, user.isActive)}
                                                disabled={deactivateMutation.isPending && deactivateMutation.variables === user.id}
                                            />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
