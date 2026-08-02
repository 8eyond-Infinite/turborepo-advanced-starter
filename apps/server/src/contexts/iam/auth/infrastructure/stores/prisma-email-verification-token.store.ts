import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import type { EmailVerificationTokenStore } from '../../application/ports/email-verification-token-store.port';

@Injectable()
export class PrismaEmailVerificationTokenStore implements EmailVerificationTokenStore {
  constructor(private readonly prisma: PrismaService) {}

  async issue(
    userId: string,
    email: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.deleteMany({ where: { userId } });
      await tx.emailVerificationToken.create({
        data: { userId, email, tokenHash, expiresAt },
      });
    });
  }

  async consume(
    tokenHash: string,
    now: Date,
  ): Promise<{ userId: string; email: string } | null> {
    return this.prisma.$transaction(async (tx) => {
      const token = await tx.emailVerificationToken.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          userId: true,
          email: true,
          expiresAt: true,
          consumedAt: true,
        },
      });
      if (!token || token.consumedAt || token.expiresAt <= now) return null;

      const consumed = await tx.emailVerificationToken.updateMany({
        where: { id: token.id, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      return consumed.count === 1
        ? { userId: token.userId, email: token.email }
        : null;
    });
  }
}
