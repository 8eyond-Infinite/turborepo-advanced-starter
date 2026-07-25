export interface AuditLogListParams {
  page: number;
  limit: number;
  search: string;
}

export const auditKeys = {
  all: ["audit-logs"] as const,
  lists: () => [...auditKeys.all, "list"] as const,
  list: (params: AuditLogListParams) => [...auditKeys.lists(), params] as const,
};
