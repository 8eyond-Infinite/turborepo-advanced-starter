import type { AuditLog, PaginatedResult } from "@repo/types";
import { ApiClient } from "@/lib/api-client";
import type { AuditLogListParams } from "./audit.keys";

const getAuditLogs = ({ page, limit, search }: AuditLogListParams) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search) params.set("search", search);
  return ApiClient.get<PaginatedResult<AuditLog>>(
    `/audit-logs?${params.toString()}`,
  );
};

export const auditApi = { getAuditLogs };
