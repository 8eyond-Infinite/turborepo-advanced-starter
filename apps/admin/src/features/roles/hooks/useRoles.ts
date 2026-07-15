import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '@/lib/api-client';
import { toast } from 'sonner';

export interface Role {
    id: string;
    name: string;
    description: string | null;
    permissions: string[];
    createdAt?: string;
}

export interface Permission {
    id: string;
    name: string;
    description: string | null;
}

export const useRoles = () => {
    const queryClient = useQueryClient();
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleDesc, setNewRoleDesc] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const { data: roles = [], isLoading: isLoadingRoles } = useQuery<Role[]>({
        queryKey: ['roles'],
        queryFn: async () => {
            return await ApiClient.get<Role[]>('/roles');
        },
        staleTime: 60000,
    });

    const { data: systemPermissions = [], isLoading: isLoadingPermissions } = useQuery<Permission[]>({
        queryKey: ['system-permissions'],
        queryFn: async () => {
            return await ApiClient.get<Permission[]>('/roles/permissions');
        },
        staleTime: 120000,
    });

    // 3. Create Role Mutation
    const createRoleMutation = useMutation({
        mutationFn: async (data: { name: string; description?: string }) => {
            return await ApiClient.post<Role>('/roles', data);
        },
        onSuccess: (newRole) => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            setNewRoleName('');
            setNewRoleDesc('');
            setIsAdding(false);
            toast.success(`Đã tạo vai trò "${newRole.name}" thành công!`);
        },
        onError: (err: any) => {
            toast.error("Không thể tạo vai trò: " + err.message);
        }
    });

    const createRole = () => {
        if (!newRoleName.trim()) return;
        createRoleMutation.mutate({
            name: newRoleName.trim(),
            description: newRoleDesc.trim() || undefined,
        });
    };

    // 4. Delete Role Mutation
    const deleteRoleMutation = useMutation({
        mutationFn: async (roleId: string) => {
            await ApiClient.delete(`/roles/${roleId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            toast.success("Xóa vai trò thành công!");
        },
        onError: (err: any) => {
            toast.error("Không thể xóa vai trò: " + err.message);
        }
    });

    const deleteRole = (roleId: string, roleName: string) => {
        const isDefaultRole = roleName === 'ADMIN' || roleName === 'USER' || roleId === '1';
        if (isDefaultRole) {
            toast.error(`Không thể xóa vai trò mặc định "${roleName}"!`);
            return;
        }
        deleteRoleMutation.mutate(roleId);
    };

    // 5. Update Permissions Mutation
    const updatePermissionsMutation = useMutation({
        mutationFn: async ({ roleId, permissions }: { roleId: string; permissions: string[] }) => {
            return await ApiClient.put<Role>(`/roles/${roleId}/permissions`, { permissions });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            toast.success("Đồng bộ quyền hạn vai trò thành công!");
        },
        onError: (err: any) => {
            toast.error("Không thể cập nhật quyền: " + err.message);
        }
    });

    const toggleRolePermission = (roleId: string, permissionName: string) => {
        const role = roles.find(r => r.id === roleId);
        if (!role) return;

        const isChecked = role.permissions.includes(permissionName);
        const newPermissions = isChecked
            ? role.permissions.filter(p => p !== permissionName)
            : [...role.permissions, permissionName];

        updatePermissionsMutation.mutate({ roleId, permissions: newPermissions });
    };

    return {
        roles,
        systemPermissions,
        newRoleName,
        setNewRoleName,
        newRoleDesc,
        setNewRoleDesc,
        isAdding,
        setIsAdding,
        createRole,
        deleteRole,
        toggleRolePermission,
        isLoading: isLoadingRoles || isLoadingPermissions,
        isSaving: updatePermissionsMutation.isPending,
        isCreating: createRoleMutation.isPending,
        isDeleting: deleteRoleMutation.isPending,
    };
};
