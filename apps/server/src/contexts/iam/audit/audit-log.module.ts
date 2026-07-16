import { Module } from '@nestjs/common';
import { PrismaModule } from '@shared/infrastructure/prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { AuditLogController } from './presentation/controllers/audit-log.controller';

@Module({
    imports: [PrismaModule, UsersModule],
    controllers: [AuditLogController],
})
export class AuditLogModule {}
