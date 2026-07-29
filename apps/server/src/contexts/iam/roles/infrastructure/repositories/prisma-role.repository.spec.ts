import { RoleEntity } from '../../domain/role.entity';
import { PrismaRoleRepository } from './prisma-role.repository';

describe('PrismaRoleRepository permission replacement', () => {
  const tx = {
    role: {
      count: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    rolePermission: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    permission: {
      findMany: jest.fn(),
    },
    user: {
      updateMany: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn(
      async (operation: (client: typeof tx) => Promise<void>) => operation(tx),
    ),
  };
  const repository = new PrismaRoleRepository(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    tx.role.count.mockResolvedValue(1);
    tx.role.update.mockResolvedValue({});
    tx.rolePermission.deleteMany.mockResolvedValue({ count: 1 });
    tx.rolePermission.createMany.mockResolvedValue({ count: 1 });
    tx.user.updateMany.mockResolvedValue({ count: 1 });
  });

  it('replaces mappings and revokes affected access tokens atomically', async () => {
    tx.rolePermission.findMany.mockResolvedValue([
      { permissionId: 'permission-read' },
    ]);
    tx.permission.findMany.mockResolvedValue([
      { id: 'permission-read', name: 'user:read' },
      { id: 'permission-update', name: 'user:update' },
    ]);
    const role = RoleEntity.register({
      id: 'role-id',
      name: 'SUPPORT',
      permissions: ['user:read', 'user:update'],
    });

    await repository.replacePermissionsAndRevokeAffectedUsers(role);

    expect(tx.rolePermission.deleteMany).toHaveBeenCalledWith({
      where: { roleId: 'role-id' },
    });
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { userRoles: { some: { roleId: 'role-id' } } },
      data: { tokenVersion: { increment: 1 } },
    });
  });

  it('does not rewrite mappings or revoke tokens when the set is unchanged', async () => {
    tx.rolePermission.findMany.mockResolvedValue([
      { permissionId: 'permission-update' },
      { permissionId: 'permission-read' },
    ]);
    tx.permission.findMany.mockResolvedValue([
      { id: 'permission-read', name: 'user:read' },
      { id: 'permission-update', name: 'user:update' },
    ]);
    const role = RoleEntity.register({
      id: 'role-id',
      name: 'SUPPORT',
      permissions: ['user:read', 'user:update'],
    });

    await repository.replacePermissionsAndRevokeAffectedUsers(role);

    expect(tx.rolePermission.deleteMany).not.toHaveBeenCalled();
    expect(tx.rolePermission.createMany).not.toHaveBeenCalled();
    expect(tx.user.updateMany).not.toHaveBeenCalled();
  });
});
