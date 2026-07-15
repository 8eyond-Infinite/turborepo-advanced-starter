import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Key, Plus, Save, Trash2 } from 'lucide-react';
import { useRoles, type Role } from '../hooks/useRoles';

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
    const {
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
    } = useRoles(DEFAULT_ROLES);

    const handleCreateRoleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createRole();
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
                        >
                            <Plus className="h-3.5 w-3.5" /> Thêm mới
                        </Button>
                    </div>

                    {isAdding && (
                        <Card className="border border-violet-500/20 bg-zinc-900/30 p-4">
                            <form onSubmit={handleCreateRoleSubmit} className="space-y-3.5">
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
                                    >
                                        Hủy
                                    </Button>
                                    <Button
                                        type="submit"
                                        size="sm"
                                    >
                                        Tạo vai trò
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
                                className={`p-4 rounded-xl border transition-all cursor-pointer flex justify-between items-start gap-4 relative overflow-hidden group ${
                                    selectedRoleId === role.id
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
                                            deleteRole(role.id, role.name);
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

                <div className="md:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
                            Quyền hạn của vai trò: <span className="text-violet-400 font-bold ml-1">{activeRole?.name}</span>
                        </h3>
                        <div className="flex items-center gap-3">
                            <Button
                                onClick={saveChanges}
                            >
                                <Save className="h-3.5 w-3.5" /> Lưu thay đổi
                            </Button>
                        </div>
                    </div>

                    <Card className="border border-zinc-800/80 bg-zinc-900/20 backdrop-blur">
                        <CardHeader className="border-b border-zinc-800/60 pb-4">
                            <CardTitle className="text-base font-bold text-zinc-200 flex items-center gap-2">
                                <Key className="h-5 w-5 text-violet-400" /> Ma trận phân quyền
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
                                                        onCheckedChange={() => togglePermission(perm.id)}
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
