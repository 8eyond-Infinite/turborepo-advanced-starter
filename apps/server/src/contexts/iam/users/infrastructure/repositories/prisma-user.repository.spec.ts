import type { PrismaService } from '@infrastructure/database/prisma.service';
import { UserEntity } from '../../domain/user.entity';
import { PrismaUserRepository } from './prisma-user.repository';

describe('PrismaUserRepository administrator invariant', () => {
  it('locks and rejects removing the only active administrator before writing', async () => {
    const transaction = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      user: {
        findFirst: jest.fn().mockResolvedValue({
          isActive: true,
          isDeleted: false,
          userRoles: [{ roleId: 'admin-role-id' }],
        }),
        count: jest.fn().mockResolvedValue(1),
        upsert: jest.fn(),
      },
      userRole: { deleteMany: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn(
        (callback: (tx: typeof transaction) => Promise<boolean>) =>
          callback(transaction),
      ),
    } as unknown as PrismaService;
    const repository = new PrismaUserRepository(prisma);
    const administrator = UserEntity.register({
      id: 'admin-id',
      email: 'admin@example.com',
      username: 'admin',
      passwordHash: 'hashed-password',
      roles: ['ADMIN'],
    });
    administrator.updateRoles(['USER']);

    await expect(
      repository.savePreservingLastAdministrator(administrator),
    ).resolves.toBe(false);

    expect(transaction.$executeRaw).toHaveBeenCalledTimes(1);
    expect(transaction.user.count).toHaveBeenCalledTimes(1);
    expect(transaction.user.upsert).not.toHaveBeenCalled();
    expect(transaction.userRole.deleteMany).not.toHaveBeenCalled();
  });
});

describe('PrismaUserRepository.changePassword', () => {
  it('updates only an active credential and increments tokenVersion atomically', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const repository = new PrismaUserRepository({
      user: { updateMany },
    } as unknown as PrismaService);

    await expect(
      repository.changePassword('user-id', 'new-hash'),
    ).resolves.toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'user-id', isActive: true, isDeleted: false },
      data: {
        password: 'new-hash',
        tokenVersion: { increment: 1 },
        updatedAt: expect.any(Date),
      },
    });
  });
});
