import type { AuditLog } from "@repo/types";

interface AuditLogDetailsProps {
  log: AuditLog;
}

export const AuditLogDetails = ({ log }: AuditLogDetailsProps) => (
  <div className="mt-1 space-y-2 text-[11px] text-muted-foreground">
    <p className="max-w-2xl break-words rounded-lg border border-border/40 bg-muted/30 p-2.5 text-xs font-medium leading-relaxed text-foreground/95">
      {log.details}
    </p>
    <dl className="grid gap-x-4 gap-y-1 pl-0.5 sm:grid-cols-3">
      <div>
        <dt className="sr-only">Thực hiện bởi</dt>
        <dd>
          Bởi:{" "}
          <strong className="font-semibold text-foreground/80">
            {log.userEmail || "Hệ thống"}
          </strong>
        </dd>
      </div>
      <div>
        <dt className="sr-only">Địa chỉ IP</dt>
        <dd className="font-mono">IP: {log.ip || "Unknown"}</dd>
      </div>
      <div className="min-w-0">
        <dt className="sr-only">Thiết bị</dt>
        <dd className="truncate" title={log.userAgent || "Unknown"}>
          Thiết bị: {log.userAgent || "Unknown"}
        </dd>
      </div>
      <div className="min-w-0 sm:col-span-3">
        <dt className="sr-only">Mã truy vết</dt>
        <dd
          className="truncate font-mono"
          title={log.correlationId || undefined}
        >
          Mã truy vết: {log.correlationId || "Không có"}
        </dd>
      </div>
    </dl>
  </div>
);
