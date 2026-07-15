import { useState } from 'react';
import { toast } from 'sonner';

export interface Role {
    id: string;
    name: string;
    description: string;
    permissions: string[];
}

export const useRoles = (initialRoles: Role[]) => {
    const [roles, setRoles] = useState<Role[]>(initialRoles);
    const [selectedRoleId, setSelectedRoleId] = useState<string>('1');
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleDesc, setNewRoleDesc] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const activeRole = roles.find((r) => r.id === selectedRoleId) || roles[0];

    const togglePermission = (permissionId: string) => {
        setRoles((prev) =>
            prev.map((role) => {
                if (role.id !== selectedRoleId) return role;

                const hasPerm = role.permissions.includes(permissionId);
                const updatedPerms = hasPerm
                    ? role.permissions.filter((p) => p !== permissionId)
                    : [...role.permissions, permissionId];

                return { ...role, permissions: updatedPerms };
            })
        );
    };

    const createRole = () => {
        if (!newRoleName.trim()) return;

        const newRole: Role = {
            id: String(roles.length + 1),
            name: newRoleName.trim(),
            description: newRoleDesc.trim() || 'Không có mô tả.',
            permissions: ['users:read'],
        };

        setRoles((prev) => [...prev, newRole]);
        setSelectedRoleId(newRole.id);
        setNewRoleName('');
        setNewRoleDesc('');
        setIsAdding(false);
        toast.success(`Đã tạo vai trò "${newRole.name}" thành công!`);
    };

    const deleteRole = (roleId: string, roleName: string) => {
        if (roleId === '1') {
            toast.error('Không thể xóa vai trò Super Administrator mặc định!');
            return;
        }
        if (window.confirm(`Bạn có chắc chắn muốn xóa vai trò "${roleName}"?`)) {
            setRoles((prev) => prev.filter((r) => r.id !== roleId));
            setSelectedRoleId('1');
            toast.success(`Đã xóa vai trò "${roleName}"!`);
        }
    };

    const saveChanges = () => {
        toast.success("Lưu ma trận phân quyền thành công (Simulated)!");
    };

    return {
        roles,
        selectedRoleId,
        setSelectedRoleId,
        newRoleName,
        setNewRoleName,
        newRoleDesc,
        setNewRoleDesc,
        isAdding,
        setIsAdding,
        activeRole,
        togglePermission,
        createRole,
        deleteRole,
        saveChanges,
    };
};
