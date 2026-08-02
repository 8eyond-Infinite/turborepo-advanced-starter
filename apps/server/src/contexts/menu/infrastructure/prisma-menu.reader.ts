import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import type {
  MenuReader,
  MenuRecord,
} from '../application/ports/menu-reader.port';

@Injectable()
export class PrismaMenuReader implements MenuReader {
  constructor(private readonly prisma: PrismaService) {}

  findAllOrdered(): Promise<MenuRecord[]> {
    return this.prisma.menu.findMany({ orderBy: [{ order: 'asc' }] });
  }
}
