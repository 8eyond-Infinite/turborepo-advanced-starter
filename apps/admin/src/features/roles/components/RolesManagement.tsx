import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog, PageHeader, QueryErrorState } from "@/components";
import {
  Key,
  Plus,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Folder,
  FolderOpen,
  Save,
  X,
} from "lucide-react";
import { useRoles } from "../hooks/useRoles";
import { Can, usePermissions } from "@/app/access/usePermission";
import { isSystemRole, PERMISSIONS } from "@repo/contracts";
import type { PermissionRecord } from "@repo/types";
import { validateRoleForm, type RoleFormErrors } from "./role-form.validation";

const groupPermissions = (perms: PermissionRecord[]) => {
  const groups: Record<string, PermissionRecord[]> = {};
  for (const p of perms) {
    const category = p.module || "Khác";
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(p);
  }
  return Object.entries(groups).map(([category, items]) => ({
    category: category.toUpperCase(),
    rawCategoryName: category,
    permissions: items.map((i) => ({
      id: i.name,
      name: i.displayName || i.name,
      description:
        i.description || `Cho phép thực hiện thao tác ${i.name} trên hệ thống.`,
    })),
  }));
};

const hasSamePermissions = (left: string[], right: string[]) =>
  left.length === right.length &&
  left.every((permission) => right.includes(permission));

export const RolesManagement = () => {
  const {
    roles,
    systemPermissions,
    createRole,
    deleteRole,
    updateRolePermissions,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    isSaving,
    savingRoleId,
    isCreating,
    isDeleting,
  } = useRoles();

  const access = usePermissions({
    canCreateRole: PERMISSIONS.ROLE.CREATE,
    canManageRolePermissions: PERMISSIONS.ROLE.UPDATE,
    canDeleteRole: PERMISSIONS.ROLE.DELETE,
  });

  const [collapsedCategories, setCollapsedCategories] = useState<
    Record<string, boolean>
  >({});
  const [isAdding, setIsAdding] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [formErrors, setFormErrors] = useState<RoleFormErrors>({});
  const [permissionDrafts, setPermissionDrafts] = useState<
    Record<string, string[]>
  >({});

  const toggleCategory = (categoryKey: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [categoryKey]: !prev[categoryKey],
    }));
  };

  const togglePermissionDraft = (
    roleId: string,
    currentPermissions: string[],
    permissionName: string,
  ) => {
    setPermissionDrafts((current) => {
      const draft = current[roleId] ?? currentPermissions;
      const next = draft.includes(permissionName)
        ? draft.filter((permission) => permission !== permissionName)
        : [...draft, permissionName];
      return { ...current, [roleId]: next };
    });
  };

  const discardPermissionDraft = (roleId: string) => {
    setPermissionDrafts((current) => {
      const next = { ...current };
      delete next[roleId];
      return next;
    });
  };

  const savePermissionDraft = async (roleId: string) => {
    const permissions = permissionDrafts[roleId];
    if (!permissions) return;

    try {
      await updateRolePermissions(roleId, permissions);
      discardPermissionDraft(roleId);
    } catch {
      // Mutation hook owns the domain error toast; keep the draft for retry.
    }
  };

  const handleCreateRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validateRoleForm({
      name: newRoleName,
      description: newRoleDesc,
    });
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      await createRole({
        name: newRoleName.trim(),
        description: newRoleDesc.trim() || undefined,
      });
      setNewRoleName("");
      setNewRoleDesc("");
      setFormErrors({});
      setIsAdding(false);
    } catch {
      // The mutation hook owns the domain error toast.
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Đang tải ma trận phân quyền hệ thống...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <QueryErrorState
        error={error}
        onRetry={() => void refetch()}
        isRetrying={isFetching}
        className="min-h-64"
      />
    );
  }

  const permissionGroups = groupPermissions(systemPermissions);

  return (
    <div className="space-y-6 bg-background text-foreground">
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
      {isAdding && (
        <Can I={PERMISSIONS.ROLE.CREATE}>
          <Card className="border-border bg-card p-5 max-w-xl transition-all">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-sm font-bold">
                Tạo Vai trò mới
              </CardTitle>
              <CardDescription className="text-xs">
                Thêm một nhóm vai trò mới. Sau khi tạo, bạn có thể gán quyền
                trực tiếp trên bảng ma trận.
              </CardDescription>
            </CardHeader>
            <form
              onSubmit={handleCreateRoleSubmit}
              className="space-y-3.5"
              noValidate
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="role-name"
                    className="text-xs font-semibold text-muted-foreground"
                  >
                    Tên vai trò
                  </label>
                  <Input
                    id="role-name"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="Ví dụ: Moderator, Support..."
                    className="mt-1 bg-transparent border-input"
                    aria-invalid={Boolean(formErrors.name)}
                    aria-describedby={
                      formErrors.name ? "role-name-error" : undefined
                    }
                  />
                  {formErrors.name && (
                    <p
                      id="role-name-error"
                      className="mt-1 text-xs text-destructive"
                    >
                      {formErrors.name}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="role-description"
                    className="text-xs font-semibold text-muted-foreground"
                  >
                    Mô tả ngắn
                  </label>
                  <Input
                    id="role-description"
                    value={newRoleDesc}
                    onChange={(e) => setNewRoleDesc(e.target.value)}
                    placeholder="Ví dụ: Hỗ trợ duyệt bài viết..."
                    className="mt-1 bg-transparent border-input"
                    aria-invalid={Boolean(formErrors.description)}
                    aria-describedby={
                      formErrors.description
                        ? "role-description-error"
                        : undefined
                    }
                  />
                  {formErrors.description && (
                    <p
                      id="role-description-error"
                      className="mt-1 text-xs text-destructive"
                    >
                      {formErrors.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t border-border">
                <Button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  variant="ghost"
                  size="sm"
                  disabled={isCreating}
                  className="cursor-pointer"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isCreating}
                  className="cursor-pointer"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Đang tạo...
                    </>
                  ) : (
                    "Tạo vai trò"
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </Can>
      )}
      <Card className="border border-border bg-card overflow-hidden">
        <CardHeader className="border-b border-border pb-4 bg-muted/10">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <Key className="h-4 w-4 text-muted-foreground" /> Bảng phân quyền
            (Permission Grid)
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Thay đổi checkbox được giữ nháp theo từng vai trò. Kiểm tra lại rồi
            bấm Lưu để thay toàn bộ tập quyền, hoặc Hủy để trở về dữ liệu đã
            lưu.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/5">
              <TableRow>
                <TableHead className="w-[340px] font-bold text-foreground py-4 pl-6">
                  Quyền hạn / Nguồn tài nguyên
                </TableHead>
                {roles.map((role) => {
                  const draft = permissionDrafts[role.id] ?? role.permissions;
                  const isDirty = !hasSamePermissions(draft, role.permissions);
                  const isThisRoleSaving = isSaving && savingRoleId === role.id;

                  return (
                    <TableHead
                      key={role.id}
                      className="text-center font-bold text-foreground py-4 min-w-[120px]"
                    >
                      <div className="flex flex-col items-center gap-1 group">
                        <span className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                          {role.name}
                        </span>
                        {isDirty && (
                          <div className="mt-1 flex items-center gap-1">
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 px-2 text-[11px]"
                              disabled={isSaving}
                              onClick={() => void savePermissionDraft(role.id)}
                              aria-label={`Lưu thay đổi quyền cho vai trò ${role.name}`}
                            >
                              {isThisRoleSaving ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <Save className="mr-1 h-3 w-3" />
                              )}
                              Lưu
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={isSaving}
                              onClick={() => discardPermissionDraft(role.id)}
                              aria-label={`Hủy thay đổi quyền cho vai trò ${role.name}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                        <span
                          className="text-[10px] text-muted-foreground font-normal max-w-[140px] truncate"
                          title={role.description || ""}
                        >
                          {role.description || "Không có mô tả"}
                        </span>
                        {!isSystemRole(role.name) && (
                          <Can I={PERMISSIONS.ROLE.DELETE}>
                            <ConfirmDialog
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 mt-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                                  disabled={isDeleting}
                                  aria-label={`Xóa vai trò ${role.name}`}
                                  title={`Xóa vai trò ${role.name}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              }
                              title="Xóa vai trò chưa được sử dụng?"
                              description={
                                <span>
                                  Vai trò <strong>{role.name}</strong> sẽ được
                                  đánh dấu xóa. Nếu vẫn còn user mang vai trò
                                  này, backend sẽ từ chối và yêu cầu chuyển
                                  assignment trước.
                                </span>
                              }
                              confirmText="Xác nhận xóa"
                              pendingText="Đang xóa..."
                              variant="destructive"
                              onConfirm={() => deleteRole(role.id, role.name)}
                            />
                          </Can>
                        )}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissionGroups.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={roles.length + 1}
                    className="p-8 text-center text-sm text-muted-foreground"
                  >
                    Không tìm thấy quyền hạn hệ thống nào trong cơ sở dữ liệu.
                  </TableCell>
                </TableRow>
              ) : (
                permissionGroups.map((group) => {
                  const isCollapsed = collapsedCategories[group.category];
                  return (
                    <React.Fragment key={group.category}>
                      {/* Collapsible Category Header Row */}
                      <TableRow className="bg-muted/15 hover:bg-muted/25 transition-colors border-y border-border select-none group">
                        <TableCell colSpan={roles.length + 1} className="p-0">
                          <button
                            type="button"
                            aria-expanded={!isCollapsed}
                            onClick={() => toggleCategory(group.category)}
                            className="flex w-full items-center gap-2.5 py-3 pl-6 pr-4 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                          >
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
                          </button>
                        </TableCell>
                      </TableRow>
                      {!isCollapsed &&
                        group.permissions.map((perm) => (
                          <TableRow
                            key={perm.id}
                            className="hover:bg-muted/5 transition-colors"
                          >
                            <TableCell className="py-3.5 pl-12 pr-4 align-top">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm text-foreground">
                                    {perm.name}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-normal font-normal">
                                  {perm.description ||
                                    `Quyền hạn thực thi API ${perm.name}`}
                                </p>
                              </div>
                            </TableCell>
                            {roles.map((role) => {
                              const draft =
                                permissionDrafts[role.id] ?? role.permissions;
                              const isChecked = draft.includes(perm.id);
                              return (
                                <TableCell
                                  key={role.id}
                                  className="text-center py-3.5 align-middle"
                                >
                                  <div className="flex items-center justify-center">
                                    <Checkbox
                                      checked={isChecked}
                                      aria-label={`${isChecked ? "Thu hồi" : "Cấp"} quyền ${perm.name} cho vai trò ${role.name}`}
                                      disabled={
                                        !access.canManageRolePermissions ||
                                        isSaving
                                      }
                                      onCheckedChange={() =>
                                        togglePermissionDraft(
                                          role.id,
                                          role.permissions,
                                          perm.id,
                                        )
                                      }
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
