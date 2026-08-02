import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { User } from "@repo/types";
import { PERMISSIONS } from "@repo/contracts";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, PageCard, PageHeader } from "@/components";
import { usePermissions } from "@/app/access/usePermission";
import { useAuthStore } from "@/features/auth";
import { useUsers } from "../hooks/useUsers";
import { AddUserCard } from "./AddUserCard";
import { EditUserModal } from "./EditUserModal";
import { UserSearchInput } from "./UserSearchInput";
import { UsersDataTable } from "./UsersDataTable";

const parsePage = (value: string | null): number => {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
};

export const UserTable = () => {
  const currentUserId = useAuthStore((state) => state.user?.id ?? null);
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const currentPage = parsePage(searchParams.get("page"));
  const [isAdding, setIsAdding] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [togglingUser, setTogglingUser] = useState<User | null>(null);

  const access = usePermissions({
    canCreateUser: PERMISSIONS.USER.CREATE,
    canUpdateUser: PERMISSIONS.USER.UPDATE,
    canDeleteUser: PERMISSIONS.USER.DELETE,
  });

  const handleSearch = useCallback(
    (nextSearch: string) => {
      if (nextSearch === search) return;
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (nextSearch) next.set("q", nextSearch);
          else next.delete("q");
          next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    [search, setSearchParams],
  );

  const handlePageChange = (page: number) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (page <= 1) next.delete("page");
      else next.set("page", String(page));
      return next;
    });
  };

  const usersState = useUsers({
    page: currentPage,
    limit: 10,
    search,
    loadRoles: access.canCreateUser || access.canUpdateUser,
  });

  useEffect(() => {
    if (usersState.isLoading || usersState.isError) return;
    const lastAvailablePage = Math.max(1, usersState.meta.totalPages);
    if (currentPage <= lastAvailablePage) return;

    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (lastAvailablePage === 1) next.delete("page");
        else next.set("page", String(lastAvailablePage));
        return next;
      },
      { replace: true },
    );
  }, [
    currentPage,
    setSearchParams,
    usersState.isError,
    usersState.isLoading,
    usersState.meta.totalPages,
  ]);

  return (
    <div className="space-y-6 bg-background text-foreground">
      <PageHeader
        title="Quản lý Người dùng"
        description="Quản lý danh sách thành viên, cấp vai trò và khóa/xóa tài khoản truy cập."
      >
        {access.canCreateUser && (
          <Button
            onClick={() => setIsAdding((open) => !open)}
            variant="outline"
            size="sm"
            aria-expanded={isAdding}
          >
            <UserPlus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Thêm người dùng mới
          </Button>
        )}
      </PageHeader>

      {isAdding && access.canCreateUser && (
        <AddUserCard
          onClose={() => setIsAdding(false)}
          onCreateUser={usersState.createUser}
          isCreating={usersState.isCreating}
          roles={usersState.roles}
          isRolesLoading={usersState.isRolesLoading}
          isRolesError={usersState.isRolesError}
          rolesError={usersState.rolesError}
          onRetryRoles={() => void usersState.refetchRoles()}
        />
      )}

      <PageCard className="overflow-hidden border-border p-0">
        <div className="border-b border-border/50 bg-muted/5 p-4">
          <UserSearchInput
            key={search}
            initialValue={search}
            onSearch={handleSearch}
          />
        </div>
        <UsersDataTable
          users={usersState.users}
          currentUserId={currentUserId}
          search={search}
          currentPage={usersState.meta.currentPage}
          totalPages={usersState.meta.totalPages}
          canUpdate={access.canUpdateUser}
          canDelete={access.canDeleteUser}
          isLoading={usersState.isLoading}
          isError={usersState.isError}
          error={usersState.error}
          isFetching={usersState.isFetching}
          isToggling={usersState.isChangingStatus}
          togglingUserId={usersState.changingStatusUserId}
          isDeleting={usersState.isDeleting}
          deletingUserId={usersState.deletingUserId}
          onRetry={() => void usersState.refetch()}
          onPageChange={handlePageChange}
          onEdit={setEditingUser}
          onToggle={setTogglingUser}
          onDelete={usersState.deleteUser}
        />
      </PageCard>

      <ConfirmDialog
        open={Boolean(togglingUser)}
        onOpenChange={(open) => !open && setTogglingUser(null)}
        title={
          togglingUser?.isActive
            ? "Xác nhận khóa tài khoản?"
            : "Xác nhận kích hoạt tài khoản?"
        }
        description={
          togglingUser?.isActive
            ? `Tài khoản ${togglingUser.email} sẽ bị hủy kích hoạt và toàn bộ refresh session sẽ được thu hồi.`
            : `Tài khoản ${togglingUser?.email} sẽ được kích hoạt lại.`
        }
        confirmText={togglingUser?.isActive ? "Khóa tài khoản" : "Kích hoạt"}
        pendingText={
          togglingUser?.isActive ? "Đang khóa..." : "Đang kích hoạt..."
        }
        onConfirm={async () => {
          if (!togglingUser) return;
          await usersState.changeStatus({
            id: togglingUser.id,
            activate: !togglingUser.isActive,
          });
          setTogglingUser(null);
        }}
      />

      {editingUser && access.canUpdateUser && (
        <EditUserModal
          key={editingUser.id}
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onUpdateUser={usersState.updateUser}
          isUpdating={usersState.isUpdating}
          roles={usersState.roles}
          isRolesLoading={usersState.isRolesLoading}
          isRolesError={usersState.isRolesError}
          rolesError={usersState.rolesError}
          onRetryRoles={() => void usersState.refetchRoles()}
        />
      )}
    </div>
  );
};
