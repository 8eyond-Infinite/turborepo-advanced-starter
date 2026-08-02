export const AUDIT_LOG_READER = Symbol('AUDIT_LOG_READER');

export interface AuditLogRecord {
  id: string;
  action: string;
  details: string;
  userId: string | null;
  userEmail: string | null;
  ip: string | null;
  userAgent: string | null;
  correlationId: string | null;
  createdAt: Date;
}

export interface AuditLogReader {
  findPage(input: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<{ logs: AuditLogRecord[]; total: number }>;
}
