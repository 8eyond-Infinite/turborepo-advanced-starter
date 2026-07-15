import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Key, Plus, Save, Trash2 } from 'lucide-react';

import { toast } from "sonner";

interface Role {
    id: string;
    name: string;
    description: string;
    permissions: string[];
}

interface PermissionGroup {
    category: string;
    permissions: {
        id: string;
        name: string;
        description: string;
    }[];
}

const DEFAULT_ROLES: Role[] = [
    {
        id: '1',
        name: 'Super Administrator',
        description: 'Toàn quyền điều khiển hệ thống, thay đổi cấu hình hạ tầng và logs.',
        permissions: ['users:read', 'users:write', 'roles:write', 'system:config', 'logs:view'],
    },
    {
        id: '2',
        name: 'Moderator',
        description: 'Hỗ trợ quản lý danh sách người dùng và theo dõi hoạt động logs.',
        permissions: ['users:read', 'users:write', 'logs:view'],
    },
    {
        id: '3',
        name: 'Standard Member',
        description: 'Tài khoản người dùng thông thường, chỉ có quyền đọc thông tin cơ bản.',
        permissions: ['users:read'],
    },
];

const PERMISSION_GROUPS: PermissionGroup[] = [
    {
        category: 'Quản lý Tài khoản (Users)',
        permissions: [
            { id: 'users:read', name: 'Đọc thông tin User', description: 'Cho phép truy xuất và xem thông tin chi tiết tài khoản.' },
            { id: 'users:write', name: 'Khóa/Mở tài khoản', description: 'Quyền thay đổi trạng thái hoạt động của người dùng.' },
        ],
    },
    {
        category: 'Vai trò & Quyền (RBAC)',
        permissions: [
            { id: 'roles:write', name: 'Quản lý vai trò (Roles)', description: 'Chỉnh sửa ma trận quyền hạn và thêm vai trò mới.' },
        ],
    },
    {
        category: 'Hạ tầng & Hệ thống (System)',
        permissions: [
            { id: 'system:config', name: 'Cấu hình hạ tầng', description: 'Quyền thao tác hệ thống Redis Cache và Database PostgreSQL.' },
            { id: 'logs:view', name: 'Xem System Logs', description: 'Cho phép truy cập nhật ký hoạt động an ninh hệ thống.' },
        ],
    },
];

export const RolesManagement = () => {
    const [roles, setRoles] = useState<Role[]>(DEFAULT_ROLES);
    const [selectedRoleId, setSelectedRoleId] = useState<string>('1');
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleDesc, setNewRoleDesc] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const activeRole = roles.find((r) => r.id === selectedRoleId) || roles[0];

    const handleTogglePermission = (permissionId: string) => {
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

    const handleCreateRole = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRoleName.trim()) return;

        const newRole: Role = {
            id: String(roles.length + 1),
            name: newRoleName.trim(),
            description: newRoleDesc.trim() || 'Không có mô tả.',
            permissions: ['users:read'], // Default permission
        };

        setRoles((prev) => [...prev, newRole]);
        setSelectedRoleId(newRole.id);
        setNewRoleName('');
        setNewRoleDesc('');
        setIsAdding(false);
        toast.success(`Đã tạo vai trò "${newRole.name}" thành công!`);
    };

    const handleDeleteRole = (roleId: string, roleName: string) => {
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

    const handleSaveChanges = () => {
        toast.success("Lưu ma trận phân quyền thành công (Simulated)!");
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Quản lý Vai trò & Quyền hạn</h2>
                <p className="text-sm text-zinc-500 mt-1">
                    Thiết lập ma trận quyền hạn (RBAC) và phân phối quyền truy cập hệ thống.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Left Panel: Roles List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Danh sách vai trò</h3>
                        <Button
                            onClick={() => setIsAdding(!isAdding)}
                            variant="outline"
                            size="sm"
                            className="text-xs flex items-center gap-1 border-zinc-800 hover:bg-zinc-800 cursor-pointer"
                        >
                            <Plus className="h-3.5 w-3.5" /> Thêm mới
                        </Button>
                    </div>

                    {isAdding && (
                        <Card className="border border-violet-500/20 bg-zinc-900/30 p-4">
                            <form onSubmit={handleCreateRole} className="space-y-3.5">
                                <div>
                                    <label className="text-xs font-semibold text-zinc-400">Tên vai trò</label>
                                    <Input
                                        value={newRoleName}
                                        onChange={(e) => setNewRoleName(e.target.value)}
                                        placeholder="Ví dụ: Editor, Support..."
                                        className="mt-1 bg-zinc-950 border-zinc-800"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-zinc-400">Mô tả ngắn</label>
                                    <Input
                                        value={newRoleDesc}
                                        onChange={(e) => setNewRoleDesc(e.target.value)}
                                        placeholder="Quyền hạn cơ bản của vai trò..."
                                        className="mt-1 bg-zinc-950 border-zinc-800"
                                    />
                                </div>
                                <div className="flex gap-2 justify-end pt-2">
                                    <Button
                                        type="button"
                                        onClick={() => setIsAdding(false)}
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs cursor-pointer"
                                    >
                                        Hủy
                                    </Button>
                                    <Button
                                        type="submit"
                                        size="sm"
                                        className="text-xs bg-violet-600 hover:bg-violet-700 text-white cursor-pointer"
                                    >
                                        Tạo ngay
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    )}

                    <div className="space-y-2">
                        {roles.map((role) => (
                            <div
                                key={role.id}
                                onClick={() => setSelectedRoleId(role.id)}
                                className={`p-4 rounded-xl border transition-all cursor-pointer flex justify-between items-start gap-4 relative overflow-hidden group ${selectedRoleId === role.id
                                        ? 'bg-violet-600/10 border-violet-500/30 text-zinc-100 shadow-md shadow-violet-500/5'
                                        : 'bg-zinc-900/20 border-zinc-800/80 text-zinc-400 hover:border-zinc-700/80 hover:text-zinc-200'
                                    }`}
                            >
                                <div className="space-y-1 select-none flex-1">
                                    <div className="flex items-center gap-2">
                                        <Shield className={`h-4 w-4 ${selectedRoleId === role.id ? 'text-violet-400' : 'text-zinc-500'}`} />
                                        <span className="font-bold text-sm">{role.name}</span>
                                    </div>
                                    <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{role.description}</p>
                                </div>
                                {role.id !== '1' && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteRole(role.id, role.name);
                                        }}
                                        className="text-zinc-600 hover:text-red-400 p-1 rounded hover:bg-red-950/20 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
                                        title="Xóa vai trò"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Panel: Permission Matrix */}
                <div className="md:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
                            Quyền hạn của vai trò: <span className="text-violet-400 font-bold ml-1">{activeRole?.name}</span>
                        </h3>
                        <div className="flex items-center gap-3">
                            <Button
                                onClick={handleSaveChanges}
                                className="bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-1.5 cursor-pointer text-xs"
                            >
                                <Save className="h-3.5 w-3.5" /> Lưu thay đổi
                            </Button>
                        </div>
                    </div>

                    <Card className="border border-zinc-800/80 bg-zinc-900/20 backdrop-blur">
                        <CardHeader className="border-b border-zinc-800/60 pb-4">
                            <CardTitle className="text-base font-bold text-zinc-200 flex items-center gap-2">
                                <Key className="h-5 w-5 text-violet-400" /> Ma Trận Phân Quyền
                            </CardTitle>
                            <CardDescription className="text-xs text-zinc-500">
                                Hãy bật/tắt các switch để cấp/thu hồi quyền truy cập tương ứng cho nhóm người dùng này.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 divide-y divide-zinc-800/60">
                            {PERMISSION_GROUPS.map((group) => (
                                <div key={group.category} className="p-6 space-y-4">
                                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                        {group.category}
                                    </h4>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {group.permissions.map((perm) => {
                                            const isChecked = activeRole?.permissions.includes(perm.id);
                                            return (
                                                <div
                                                    key={perm.id}
                                                    className="flex items-start justify-between p-3.5 rounded-xl border border-zinc-900 bg-zinc-950/40 hover:bg-zinc-950/80 hover:border-zinc-800 transition-all gap-4"
                                                >
                                                    <div className="space-y-0.5">
                                                        <p className="text-sm font-semibold text-zinc-200">{perm.name}</p>
                                                        <p className="text-xs text-zinc-500 leading-normal">{perm.description}</p>
                                                        <span className="inline-block font-mono text-[9px] text-zinc-600 mt-1 uppercase tracking-wider bg-zinc-900 px-1 py-0.5 rounded border border-zinc-800">
                                                            {perm.id}
                                                        </span>
                                                    </div>
                                                    <Switch
                                                        checked={isChecked}
                                                        onCheckedChange={() => handleTogglePermission(perm.id)}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
