export const AUDIT_WRITER = Symbol('AUDIT_WRITER');

export interface AuditEntry {
  action: string;
  details: string;
  userId?: string | null;
  userEmail?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  correlationId?: string | null;
}

export interface AuditWriter {
  write(entry: AuditEntry): Promise<void>;
}
