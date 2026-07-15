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
        <div className="space-y-6 bg-background text-foreground">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">Quản lý Vai trò & Quyền hạn</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Thiết lập ma trận quyền hạn (RBAC) và phân phối quyền truy cập hệ thống.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Left Panel: Roles List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Danh sách vai trò</h3>
                        <Button
                            onClick={() => setIsAdding(!isAdding)}
                            variant="outline"
                            size="sm"
                        >
                            <Plus className="h-3.5 w-3.5 mr-1" /> Thêm mới
                        </Button>
                    </div>

                    {isAdding && (
                        <Card className="border-border bg-card p-4">
                            <form onSubmit={handleCreateRoleSubmit} className="space-y-3.5">
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground">Tên vai trò</label>
                                    <Input
                                        value={newRoleName}
                                        onChange={(e) => setNewRoleName(e.target.value)}
                                        placeholder="Ví dụ: Editor, Support..."
                                        className="mt-1 bg-transparent border-input"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground">Mô tả ngắn</label>
                                    <Input
                                        value={newRoleDesc}
                                        onChange={(e) => setNewRoleDesc(e.target.value)}
                                        placeholder="Quyền hạn cơ bản của vai trò..."
                                        className="mt-1 bg-transparent border-input"
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
                                        ? 'bg-muted border-primary text-foreground'
                                        : 'bg-card border-border text-muted-foreground hover:border-muted hover:text-foreground'
                                }`}
                            >
                                <div className="space-y-1 select-none flex-1">
                                    <div className="flex items-center gap-2">
                                        <Shield className={`h-4 w-4 ${selectedRoleId === role.id ? 'text-primary' : 'text-muted-foreground'}`} />
                                        <span className="font-bold text-sm text-foreground">{role.name}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{role.description}</p>
                                </div>
                                {role.id !== '1' && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteRole(role.id, role.name);
                                        }}
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all shrink-0 cursor-pointer"
                                        title="Xóa vai trò"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Quyền hạn của vai trò: <span className="text-primary font-bold ml-1">{activeRole?.name}</span>
                        </h3>
                        <Button onClick={saveChanges} size="sm">
                            <Save className="h-3.5 w-3.5 mr-1" /> Lưu thay đổi
                        </Button>
                    </div>

                    <Card className="border border-border bg-card">
                        <CardHeader className="border-b border-border pb-4">
                            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                                <Key className="h-4 w-4 text-muted-foreground" /> Ma trận phân quyền
                            </CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">
                                Hãy bật/tắt các switch để cấp/thu hồi quyền truy cập tương ứng cho nhóm người dùng này.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 divide-y divide-border">
                            {PERMISSION_GROUPS.map((group) => (
                                <div key={group.category} className="p-6 space-y-4">
                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        {group.category}
                                    </h4>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {group.permissions.map((perm) => {
                                            const isChecked = activeRole?.permissions.includes(perm.id);
                                            return (
                                                <div
                                                    key={perm.id}
                                                    className="flex items-start justify-between p-3.5 rounded-xl border border-border bg-muted/10 hover:bg-muted/20 transition-all gap-4"
                                                >
                                                    <div className="space-y-0.5">
                                                        <p className="text-sm font-semibold text-foreground">{perm.name}</p>
                                                        <p className="text-xs text-muted-foreground leading-normal">{perm.description}</p>
                                                        <span className="inline-block font-mono text-[9px] text-muted-foreground mt-1 uppercase tracking-wider bg-muted/30 px-1 py-0.5 rounded border border-border">
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
