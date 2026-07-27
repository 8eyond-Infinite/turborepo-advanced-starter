import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getFriendlyErrorMessage } from "@/lib/error-handler";
import { sessionApi } from "../api/session.api";
import { sessionKeys } from "../api/session.keys";

export const useSessions = (options?: { page?: number; limit?: number }) => {
  const queryClient = useQueryClient();
  const params = {
    page: options?.page ?? 1,
    limit: options?.limit ?? 10,
  };

  const sessionsQuery = useQuery({
    queryKey: sessionKeys.list(params),
    queryFn: () => sessionApi.getSessions(params),
    staleTime: 30000,
  });

  const sessions = sessionsQuery.data?.data || [];
  const meta = sessionsQuery.data?.meta || {
    totalItems: 0,
    itemCount: 0,
    itemsPerPage: params.limit,
    totalPages: 1,
    currentPage: params.page,
  };

  const revokeSessionMutation = useMutation({
    mutationFn: sessionApi.revoke,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      toast.success("Đã thu hồi phiên đăng nhập thành công!");
    },
    onError: (error: unknown) => {
      toast.error(
        `Không thể thu hồi phiên đăng nhập: ${getFriendlyErrorMessage(error)}`,
      );
    },
  });

  const revokeAllSessionsMutation = useMutation({
    mutationFn: sessionApi.revokeOthers,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      toast.success("Đã thu hồi toàn bộ các phiên đăng nhập khác!");
    },
    onError: (error: unknown) => {
      toast.error(
        `Không thể thu hồi các phiên đăng nhập: ${getFriendlyErrorMessage(error)}`,
      );
    },
  });

  return {
    sessions,
    meta,
    isLoading: sessionsQuery.isLoading,
    isError: sessionsQuery.isError,
    error: sessionsQuery.error,
    refetch: sessionsQuery.refetch,
    isFetching: sessionsQuery.isFetching,
    revokeSession: revokeSessionMutation.mutateAsync,
    revokeAllSessions: revokeAllSessionsMutation.mutateAsync,
    isRevoking: revokeSessionMutation.isPending,
    revokingSessionId: revokeSessionMutation.variables ?? null,
    isRevokingAll: revokeAllSessionsMutation.isPending,
  };
};
