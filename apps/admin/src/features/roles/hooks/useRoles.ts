import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getFriendlyErrorMessage } from "@/lib/error-handler";
import { roleApi } from "../api/role.api";
import { roleKeys } from "../api/role.keys";
import { isSystemRole } from "@repo/contracts";

export const useRoles = () => {
  const queryClient = useQueryClient();
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const rolesQuery = useQuery({
    queryKey: roleKeys.list(),
    queryFn: roleApi.getRoles,
    staleTime: 60000,
  });

  const permissionsQuery = useQuery({
    queryKey: roleKeys.permissions(),
    queryFn: roleApi.getPermissions,
    staleTime: 120000,
  });

  const roles = rolesQuery.data || [];
  const systemPermissions = permissionsQuery.data || [];

  const createRoleMutation = useMutation({
    mutationFn: roleApi.create,
    onSuccess: async (newRole) => {
      await queryClient.invalidateQueries({ queryKey: roleKeys.all });
      setNewRoleName("");
      setNewRoleDesc("");
      setIsAdding(false);
      toast.success(`Đã tạo vai trò "${newRole.name}" thành công!`);
    },
    onError: (error: unknown) => {
      toast.error(`Không thể tạo vai trò: ${getFriendlyErrorMessage(error)}`);
    },
  });

  const createRole = () => {
    if (!newRoleName.trim()) return;
    createRoleMutation.mutate({
      name: newRoleName.trim(),
      description: newRoleDesc.trim() || undefined,
    });
  };

  const deleteRoleMutation = useMutation({
    mutationFn: roleApi.remove,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: roleKeys.all });
      toast.success("Xóa vai trò thành công!");
    },
    onError: (error: unknown) => {
      toast.error(`Không thể xóa vai trò: ${getFriendlyErrorMessage(error)}`);
    },
  });

  const deleteRole = (roleId: string, roleName: string) => {
    if (isSystemRole(roleName)) {
      toast.error(`Không thể xóa vai trò mặc định "${roleName}"!`);
      return;
    }
    deleteRoleMutation.mutate(roleId);
  };

  const updatePermissionsMutation = useMutation({
    mutationFn: roleApi.updatePermissions,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: roleKeys.all });
      toast.success("Đồng bộ quyền hạn vai trò thành công!");
    },
    onError: (error: unknown) => {
      toast.error(
        `Không thể cập nhật quyền: ${getFriendlyErrorMessage(error)}`,
      );
    },
  });

  const toggleRolePermission = (roleId: string, permissionName: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;

    const isChecked = role.permissions.includes(permissionName);
    const newPermissions = isChecked
      ? role.permissions.filter((p) => p !== permissionName)
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
    isLoading: rolesQuery.isLoading || permissionsQuery.isLoading,
    isError: rolesQuery.isError || permissionsQuery.isError,
    error: rolesQuery.error || permissionsQuery.error,
    isFetching: rolesQuery.isFetching || permissionsQuery.isFetching,
    refetch: async () => {
      await Promise.all([rolesQuery.refetch(), permissionsQuery.refetch()]);
    },
    isSaving: updatePermissionsMutation.isPending,
    isCreating: createRoleMutation.isPending,
    isDeleting: deleteRoleMutation.isPending,
  };
};
