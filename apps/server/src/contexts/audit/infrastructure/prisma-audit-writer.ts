import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  type AuditEntry,
  type AuditWriter,
} from '../application/ports/audit-writer.port';

@Injectable()
export class PrismaAuditWriter implements AuditWriter {
  constructor(private readonly prisma: PrismaService) {}

  async write(entry: AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: entry,
    });
  }
}
