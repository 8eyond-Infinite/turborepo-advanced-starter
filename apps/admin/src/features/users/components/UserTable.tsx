import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '@/lib/api-client';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { RefreshCw, UserCheck, UserX, AlertCircle, Search } from 'lucide-react';

import { toast } from "sonner";

export const UserTable = () => {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');

    // 1. Fetch Users List using React Query
    const { data: users = [], isLoading, isError, error, refetch, isFetching } = useQuery<any[]>({
        queryKey: ['users'],
        queryFn: async () => {
            return await ApiClient.get<any[]>('/users');
        },
        staleTime: 120000, // Matches 120s server cache TTL
    });

    // 2. Deactivate User Mutation
    const deactivateMutation = useMutation({
        mutationFn: async (userId: string) => {
            return await ApiClient.patch(`/users/${userId}/deactivate`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success("Khóa tài khoản người dùng thành công!");
        },
        onError: (err: any) => {
            toast.error("Khóa tài khoản thất bại: " + err.message);
        }
    });

    const handleToggleActive = (userId: string, currentActive: boolean) => {
        if (currentActive) {
            const confirmed = window.confirm(
                'Bạn có chắc chắn muốn khóa tài khoản này? Hành động này sẽ lập tức thu hồi toàn bộ token đăng nhập hợp lệ trong Redis Cache và buộc người dùng đăng xuất.'
            );
            if (confirmed) {
                deactivateMutation.mutate(userId);
            }
        } else {
            toast.info('Tính năng kích hoạt tài khoản đang được phát triển. Hiện tại backend chỉ hỗ trợ API Deactivate.');
        }
    };

    // Filter users by search query
    const filteredUsers = users.filter((user) =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center gap-3">
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
                <p className="text-sm text-center">{(error as any).message}</p>
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
            {/* Header section */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold">Danh sách người dùng</h2>
                    <p className="text-sm mt-0.5">Hiển thị toàn bộ tài khoản đăng ký trên hệ thống</p>
                </div>
                <Button
                    onClick={() => refetch()}
                    variant="outline"
                    size="icon"
                    disabled={isFetching}
                >
                    <RefreshCw className={`h-5 w-5 ${isFetching ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Filter Actions */}
            <div className="flex items-center max-w-md relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" />
                <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm người dùng theo email..."
                    className="pl-10 pr-4 bg-zinc-900/20 border-zinc-800"
                />
            </div>

            {/* Users Table */}

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
                    {filteredUsers.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="py-12 text-center">
                                {searchQuery ? 'Không tìm thấy người dùng nào khớp từ khóa.' : 'Không có người dùng nào trên hệ thống.'}
                            </TableCell>
                        </TableRow>
                    ) : (
                        filteredUsers.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell className="font-mono text-xs">{user.id}</TableCell>
                                <TableCell className="font-medium">{user.email}</TableCell>
                                <TableCell>
                                    {user.isActive ? (
                                        <Badge variant='default' className="bg-green-50 text-green-700 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium">
                                            <UserCheck className="h-3 w-3" />
                                            Đang hoạt động
                                        </Badge>
                                    ) : (
                                        <Badge variant='destructive' className="bg-red-50 text-red-700 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium">
                                            <UserX className="h-3 w-3" />
                                            Đã khóa
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell>
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
    );
};
