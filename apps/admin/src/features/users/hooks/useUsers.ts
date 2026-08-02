import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getFriendlyErrorMessage } from "@/lib/error-handler";
import { userApi } from "../api/user.api";
import { userKeys } from "../api/user.keys";
import { roleApi, roleKeys } from "@/features/roles";

export const useUsers = (options?: {
  page?: number;
  limit?: number;
  search?: string;
  loadRoles?: boolean;
}) => {
  const queryClient = useQueryClient();
  const params = {
    page: options?.page ?? 1,
    limit: options?.limit ?? 10,
    search: options?.search ?? "",
  };

  // 1. Fetch Users List
  const usersQuery = useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => userApi.getUsers(params),
    staleTime: 30000,
  });

  const users = usersQuery.data?.data || [];
  const meta = usersQuery.data?.meta || {
    totalItems: 0,
    itemCount: 0,
    itemsPerPage: params.limit,
    totalPages: 1,
    currentPage: params.page,
  };

  const rolesQuery = useQuery({
    queryKey: roleKeys.list(),
    queryFn: roleApi.getRoles,
    staleTime: 60000,
    enabled: options?.loadRoles ?? false,
  });
  const roles = rolesQuery.data ?? [];

  const createUserMutation = useMutation({
    mutationFn: userApi.create,
    onSuccess: async (newUser) => {
      await queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success(`Đã tạo tài khoản "${newUser.email}" thành công!`);
    },
    onError: (error: unknown) => {
      toast.error(`Không thể tạo tài khoản: ${getFriendlyErrorMessage(error)}`);
    },
  });

  const changeStatusMutation = useMutation({
    mutationFn: ({ id, activate }: { id: string; activate: boolean }) =>
      activate ? userApi.activate(id) : userApi.deactivate(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success("Thay đổi trạng thái tài khoản thành công!");
    },
    onError: (error: unknown) => {
      toast.error(
        `Không thể thay đổi trạng thái: ${getFriendlyErrorMessage(error)}`,
      );
    },
  });

  // 5. Delete User Mutation
  const deleteUserMutation = useMutation({
    mutationFn: userApi.remove,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success("Xóa tài khoản thành công!");
    },
    onError: (error: unknown) => {
      toast.error(`Không thể xóa tài khoản: ${getFriendlyErrorMessage(error)}`);
    },
  });

  // 6. Update User Mutation
  const updateUserMutation = useMutation({
    mutationFn: userApi.update,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success("Cập nhật thông tin tài khoản thành công!");
    },
    onError: (error: unknown) => {
      toast.error(
        `Không thể cập nhật tài khoản: ${getFriendlyErrorMessage(error)}`,
      );
    },
  });

  return {
    users,
    meta,
    roles,
    createUser: createUserMutation.mutateAsync,
    updateUser: updateUserMutation.mutateAsync,
    changeStatus: changeStatusMutation.mutateAsync,
    deleteUser: deleteUserMutation.mutateAsync,
    isLoading: usersQuery.isLoading,
    isError: usersQuery.isError,
    error: usersQuery.error,
    refetch: usersQuery.refetch,
    isFetching: usersQuery.isFetching,
    isCreating: createUserMutation.isPending,
    isUpdating: updateUserMutation.isPending,
    isChangingStatus: changeStatusMutation.isPending,
    changingStatusUserId: changeStatusMutation.variables?.id ?? null,
    isDeleting: deleteUserMutation.isPending,
    deletingUserId: deleteUserMutation.variables ?? null,
    isRolesLoading: rolesQuery.isLoading,
    isRolesError: rolesQuery.isError,
    rolesError: rolesQuery.error,
    refetchRoles: rolesQuery.refetch,
  };
};
