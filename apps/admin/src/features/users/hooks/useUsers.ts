import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '@/lib/api-client';
import { toast } from 'sonner';

export interface User {
    id: string;
    email: string;
    isActive: boolean;
    isDeleted: boolean;
    roles: string[];
    createdAt: string;
}

export const useUsers = () => {
    const queryClient = useQueryClient();

    // 1. Fetch Users List
    const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
        queryKey: ['users'],
        queryFn: async () => {
            return await ApiClient.get<User[]>('/users');
        },
        staleTime: 60000,
    });

    // 2. Fetch Roles List (for role assignment dropdown)
    const { data: roles = [] } = useQuery<any[]>({
        queryKey: ['roles'],
        queryFn: async () => {
            return await ApiClient.get<any[]>('/roles');
        },
        staleTime: 60000,
    });

    // 3. Create User Mutation
    const createUserMutation = useMutation({
        mutationFn: async (data: { email: string; password?: string; roles: string[] }) => {
            return await ApiClient.post<User>('/users', data);
        },
        onSuccess: (newUser) => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success(`Đã tạo tài khoản "${newUser.email}" thành công!`);
        },
        onError: (err: any) => {
            toast.error("Không thể tạo tài khoản: " + err.message);
        }
    });

    // 4. Toggle User Status Mutation
    const toggleStatusMutation = useMutation({
        mutationFn: async (userId: string) => {
            return await ApiClient.patch(`/users/${userId}/toggle-status`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success("Thay đổi trạng thái tài khoản thành công!");
        },
        onError: (err: any) => {
            toast.error("Không thể thay đổi trạng thái: " + err.message);
        }
    });

    // 5. Delete User Mutation
    const deleteUserMutation = useMutation({
        mutationFn: async (userId: string) => {
            await ApiClient.delete(`/users/${userId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success("Xóa tài khoản thành công!");
        },
        onError: (err: any) => {
            toast.error("Không thể xóa tài khoản: " + err.message);
        }
    });

    // 6. Update User Mutation
    const updateUserMutation = useMutation({
        mutationFn: async ({ id, ...data }: { id: string; email: string; roles: string[] }) => {
            return await ApiClient.put(`/users/${id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success("Cập nhật thông tin tài khoản thành công!");
        },
        onError: (err: any) => {
            toast.error("Không thể cập nhật tài khoản: " + err.message);
        }
    });

    return {
        users,
        roles,
        createUser: createUserMutation.mutateAsync,
        updateUser: updateUserMutation.mutateAsync,
        toggleStatus: toggleStatusMutation.mutate,
        deleteUser: deleteUserMutation.mutate,
        isLoading: isLoadingUsers,
        isCreating: createUserMutation.isPending,
        isUpdating: updateUserMutation.isPending,
        isToggling: toggleStatusMutation.isPending,
        isDeleting: deleteUserMutation.isPending,
    };
};
