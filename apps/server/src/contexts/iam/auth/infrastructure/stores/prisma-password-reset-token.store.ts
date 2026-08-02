import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import type { PasswordResetTokenStore } from '../../application/ports/password-reset-token-store.port';

@Injectable()
export class PrismaPasswordResetTokenStore implements PasswordResetTokenStore {
  constructor(private readonly prisma: PrismaService) {}

  async issue(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.deleteMany({
        where: { userId },
      });
      await tx.passwordResetToken.create({
        data: { userId, tokenHash, expiresAt },
      });
    });
  }

  async consume(tokenHash: string, now: Date): Promise<string | null> {
    return this.prisma.$transaction(async (tx) => {
      const token = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
        select: { id: true, userId: true, expiresAt: true, consumedAt: true },
      });
      if (!token || token.consumedAt || token.expiresAt <= now) return null;

      const consumed = await tx.passwordResetToken.updateMany({
        where: { id: token.id, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      return consumed.count === 1 ? token.userId : null;
    });
  }
}
