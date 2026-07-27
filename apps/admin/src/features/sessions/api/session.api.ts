import type { ActiveSession, PaginatedResult } from "@repo/types";
import { ApiClient } from "@/lib/api-client";
import type { SessionListParams } from "./session.keys";

const getSessions = ({ page, limit }: SessionListParams) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  return ApiClient.get<PaginatedResult<ActiveSession>>(
    `/auth/sessions?${params.toString()}`,
  );
};

export const sessionApi = {
  getSessions,
  revoke: (jti: string) => ApiClient.delete<void>(`/auth/sessions/${jti}`),
  revokeOthers: () =>
    ApiClient.post<void>("/auth/sessions/revoke-others", undefined),
};
