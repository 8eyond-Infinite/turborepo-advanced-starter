import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getFriendlyErrorMessage } from "@/lib/error-handler";
import { roleApi } from "../api/role.api";
import { roleKeys } from "../api/role.keys";
import { isSystemRole } from "@repo/contracts";
import type { CreateRoleInput } from "../api/role.api";

export const useRoles = () => {
  const queryClient = useQueryClient();

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
      toast.success(`Đã tạo vai trò "${newRole.name}" thành công!`);
    },
    onError: (error: unknown) => {
      toast.error(`Không thể tạo vai trò: ${getFriendlyErrorMessage(error)}`);
    },
  });

  const createRole = (input: CreateRoleInput) =>
    createRoleMutation.mutateAsync(input);

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

  const deleteRole = async (roleId: string, roleName: string) => {
    if (isSystemRole(roleName)) {
      toast.error(`Không thể xóa vai trò mặc định "${roleName}"!`);
      return;
    }
    await deleteRoleMutation.mutateAsync(roleId);
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

  const updateRolePermissions = async (
    roleId: string,
    permissions: string[],
  ) => {
    await updatePermissionsMutation.mutateAsync({ roleId, permissions });
  };

  return {
    roles,
    systemPermissions,
    createRole,
    deleteRole,
    updateRolePermissions,
    isLoading: rolesQuery.isLoading || permissionsQuery.isLoading,
    isError: rolesQuery.isError || permissionsQuery.isError,
    error: rolesQuery.error || permissionsQuery.error,
    isFetching: rolesQuery.isFetching || permissionsQuery.isFetching,
    refetch: async () => {
      await Promise.all([rolesQuery.refetch(), permissionsQuery.refetch()]);
    },
    isSaving: updatePermissionsMutation.isPending,
    savingRoleId: updatePermissionsMutation.variables?.roleId ?? null,
    isCreating: createRoleMutation.isPending,
    isDeleting: deleteRoleMutation.isPending,
  };
};
