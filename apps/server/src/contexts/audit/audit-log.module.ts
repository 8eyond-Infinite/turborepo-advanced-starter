import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { AuditLogController } from './presentation/controllers/audit-log.controller';
import { GetAuditLogsQueryHandler } from './application/queries/handlers/get-audit-logs.handler';
import { AUDIT_WRITER } from './application/ports/audit-writer.port';
import { PrismaAuditWriter } from './infrastructure/prisma-audit-writer';

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [AuditLogController],
  providers: [
    GetAuditLogsQueryHandler,
    {
      provide: AUDIT_WRITER,
      useClass: PrismaAuditWriter,
    },
  ],
  exports: [AUDIT_WRITER],
})
export class AuditLogModule {}
