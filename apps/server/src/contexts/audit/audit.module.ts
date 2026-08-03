import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { AuditLogController } from './presentation/controllers/audit-log.controller';
import { GetAuditLogsQueryHandler } from './application/queries/handlers/get-audit-logs.handler';
import { AUDIT_WRITER } from './application/ports/audit-writer.port';
import { PrismaAuditWriter } from './infrastructure/prisma-audit-writer';
import { AuditRetentionService } from './infrastructure/audit-retention.service';
import { AUDIT_LOG_READER } from './application/ports/audit-log-reader.port';
import { PrismaAuditLogReader } from './infrastructure/prisma-audit-log.reader';

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [AuditLogController],
  providers: [
    GetAuditLogsQueryHandler,
    AuditRetentionService,
    { provide: AUDIT_LOG_READER, useClass: PrismaAuditLogReader },
    {
      provide: AUDIT_WRITER,
      useClass: PrismaAuditWriter,
    },
  ],
  exports: [AUDIT_WRITER],
})
export class AuditModule {}
