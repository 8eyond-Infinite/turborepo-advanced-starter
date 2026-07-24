import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) { }

  async getHello() {
    const users = await this.prisma.user.findMany()
    return {
      message: "Hello from Advanced NestJS API!",
      databaseStatus: "Connected",
      usersCount: users.length
    };
  }
}
