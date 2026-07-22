import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog, PageHeader } from '@/components';
import { Key, Plus, Trash2, Loader2, ChevronDown, ChevronRight, ShieldCheck, Folder, FolderOpen } from 'lucide-react';
import { useRoles } from '../hooks/useRoles';
import { Can, usePermissions } from '@/hooks/usePermission';
import { PERMISSIONS } from '@repo/contracts';

const groupPermissions = (perms: any[]) => {
    const groups: { [key: string]: any[] } = {};
    for (const p of perms) {
        const category = p.module || 'Khác';
        if (!groups[category]) {
            groups[category] = [];
        }
        groups[category].push(p);
    }
    return Object.entries(groups).map(([category, items]) => ({
        category: category.toUpperCase(),
        rawCategoryName: category,
        permissions: items.map(i => ({
            id: i.name,
            name: i.displayName || i.name,
            description: i.description || `Cho phép thực hiện thao tác ${i.name} trên hệ thống.`
        }))
    }));
};

export const RolesManagement = () => {
    const {
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
        isLoading,
        isSaving,
    } = useRoles();

    // Business capability access map
    const access = usePermissions({
        canCreateRole: PERMISSIONS.ROLE.CREATE,
        canManageRolePermissions: PERMISSIONS.ROLE.UPDATE,
        canDeleteRole: PERMISSIONS.ROLE.DELETE,
    });

    // Track collapsed/expanded categories. Default: all expanded
    const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

    const toggleCategory = (categoryKey: string) => {
        setCollapsedCategories((prev) => ({
            ...prev,
            [categoryKey]: !prev[categoryKey],
        }));
    };

    const handleCreateRoleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createRole();
    };

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Đang tải ma trận phân quyền hệ thống...</span>
            </div>
        );
    }

    const permissionGroups = groupPermissions(systemPermissions);

    return (
        <div className="space-y-6 bg-background text-foreground">
            {/* Header */}
            <PageHeader
                title="Ma trận Vai trò & Quyền hạn"
                description="Quản lý quyền truy cập của từng nhóm vai trò trên hệ thống dưới dạng bảng ma trận."
            >
                {isSaving && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Đang đồng bộ...</span>
                    </div>
                )}
                <Can I={PERMISSIONS.ROLE.CREATE}>
                    <Button
                        onClick={() => setIsAdding(!isAdding)}
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                    >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Thêm vai trò mới
                    </Button>
                </Can>
            </PageHeader>

            {/* Create Role Form - rendered through <Can> */}
            {isAdding && (
                <Can I={PERMISSIONS.ROLE.CREATE}>
                    <Card className="border-border bg-card p-5 max-w-xl transition-all">
                        <CardHeader className="p-0 pb-4">
                            <CardTitle className="text-sm font-bold">Tạo Vai trò mới</CardTitle>
                            <CardDescription className="text-xs">
                                Thêm một nhóm vai trò mới. Sau khi tạo, bạn có thể gán quyền trực tiếp trên bảng ma trận.
                            </CardDescription>
                        </CardHeader>
                        <form onSubmit={handleCreateRoleSubmit} className="space-y-3.5">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground">Tên vai trò</label>
                                    <Input
                                        value={newRoleName}
                                        onChange={(e) => setNewRoleName(e.target.value)}
                                        placeholder="Ví dụ: Moderator, Support..."
                                        className="mt-1 bg-transparent border-input"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground">Mô tả ngắn</label>
                                    <Input
                                        value={newRoleDesc}
                                        onChange={(e) => setNewRoleDesc(e.target.value)}
                                        placeholder="Ví dụ: Hỗ trợ duyệt bài viết..."
                                        className="mt-1 bg-transparent border-input"
                                    />
                                </div>
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
                                >
                                    Tạo vai trò
                                </Button>
                            </div>
                        </form>
                    </Card>
                </Can>
            )}

            {/* Grid Table Matrix */}
            <Card className="border border-border bg-card overflow-hidden">
                <CardHeader className="border-b border-border pb-4 bg-muted/10">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Key className="h-4 w-4 text-muted-foreground" /> Bảng phân quyền (Permission Grid)
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                        Click vào tiêu đề nhóm để đóng/mở danh sách quyền. Tích chọn checkbox để lập tức cấp hoặc thu hồi quyền hạn.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/5">
                            <TableRow>
                                <TableHead className="w-[340px] font-bold text-foreground py-4 pl-6">Quyền hạn / Nguồn tài nguyên</TableHead>
                                {roles.map((role) => (
                                    <TableHead key={role.id} className="text-center font-bold text-foreground py-4 min-w-[120px]">
                                        <div className="flex flex-col items-center gap-1 group">
                                            <span className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
                                                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                                                {role.name}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground font-normal max-w-[140px] truncate" title={role.description || ''}>
                                                {role.description || 'Không có mô tả'}
                                            </span>
                                            {role.name !== 'ADMIN' && role.name !== 'USER' && (
                                                <Can I={PERMISSIONS.ROLE.DELETE}>
                                                    <ConfirmDialog
                                                        trigger={
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 mt-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                                                                title={`Xóa vai trò ${role.name}`}
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        }
                                                        title="Bạn có chắc chắn muốn xóa?"
                                                        description={
                                                            <span>
                                                                Hành động này không thể hoàn tác. Vai trò <strong>{role.name}</strong> sẽ bị xóa vĩnh viễn khỏi hệ thống.
                                                            </span>
                                                        }
                                                        confirmText="Xác nhận xóa"
                                                        variant="destructive"
                                                        onConfirm={() => deleteRole(role.id, role.name)}
                                                    />
                                                </Can>
                                            )}
                                        </div>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {permissionGroups.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={roles.length + 1} className="p-8 text-center text-sm text-muted-foreground">
                                        Không tìm thấy quyền hạn hệ thống nào trong cơ sở dữ liệu.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                permissionGroups.map((group) => {
                                    const isCollapsed = collapsedCategories[group.category];
                                    return (
                                        <React.Fragment key={group.category}>
                                            {/* Collapsible Category Header Row */}
                                            <TableRow
                                                onClick={() => toggleCategory(group.category)}
                                                className="bg-muted/15 hover:bg-muted/25 transition-colors cursor-pointer border-y border-border select-none group"
                                            >
                                                <TableCell
                                                    colSpan={roles.length + 1}
                                                    className="py-3 pl-6 pr-4"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="flex items-center justify-center h-5 w-5 rounded bg-muted/30 text-muted-foreground group-hover:text-foreground transition-colors">
                                                            {isCollapsed ? (
                                                                <ChevronRight className="h-4 w-4" />
                                                            ) : (
                                                                <ChevronDown className="h-4 w-4 text-primary" />
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {isCollapsed ? (
                                                                <Folder className="h-4 w-4 text-muted-foreground" />
                                                            ) : (
                                                                <FolderOpen className="h-4 w-4 text-primary" />
                                                            )}
                                                            <span className="text-xs font-bold tracking-wider text-foreground uppercase">
                                                                {group.category}
                                                            </span>
                                                        </div>
                                                        <span className="text-[11px] font-medium text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">
                                                            {group.permissions.length} quyền
                                                        </span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>

                                            {/* Individual Permission Rows (Shown only when not collapsed) */}
                                            {!isCollapsed &&
                                                group.permissions.map((perm) => (
                                                    <TableRow key={perm.id} className="hover:bg-muted/5 transition-colors">
                                                        <TableCell className="py-3.5 pl-12 pr-4 align-top">
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-semibold text-sm text-foreground">{perm.name}</span>
                                                                </div>
                                                                <p className="text-xs text-muted-foreground leading-normal font-normal">
                                                                    {perm.description || `Quyền hạn thực thi API ${perm.name}`}
                                                                </p>
                                                            </div>
                                                        </TableCell>
                                                        {roles.map((role) => {
                                                            const isChecked = role.permissions.includes(perm.id);
                                                            return (
                                                                <TableCell key={role.id} className="text-center py-3.5 align-middle">
                                                                    <div className="flex items-center justify-center">
                                                                        <Checkbox
                                                                            checked={isChecked}
                                                                            disabled={!access.canManageRolePermissions}
                                                                            onCheckedChange={() => toggleRolePermission(role.id, perm.id)}
                                                                        />
                                                                    </div>
                                                                </TableCell>
                                                            );
                                                        })}
                                                    </TableRow>
                                                ))}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};
