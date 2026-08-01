-- Audit tables can be large in an existing installation. CONCURRENTLY avoids
-- blocking normal inserts while the retention index is built.
CREATE INDEX CONCURRENTLY "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
