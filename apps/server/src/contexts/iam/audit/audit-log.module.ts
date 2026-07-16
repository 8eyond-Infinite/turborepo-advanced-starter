import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@shared/infrastructure/prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { AuditLogController } from './presentation/controllers/audit-log.controller';
import { GetAuditLogsQueryHandler } from './application/queries/handlers/get-audit-logs.handler';

@Module({
    imports: [
        CqrsModule,
        PrismaModule,
        UsersModule,
    ],
    controllers: [AuditLogController],
    providers: [GetAuditLogsQueryHandler],
})
export class AuditLogModule {}
