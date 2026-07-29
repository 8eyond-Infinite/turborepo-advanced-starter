import { SYSTEM_ROLES } from '@repo/contracts';
import { DeleteRoleCommand } from '../delete-role.command';
import { RoleEntity } from '@iam/roles/domain/role.entity';
import type { RoleRepository } from '@iam/roles/domain/ports/role.repository';
import { SystemRoleDeleteForbiddenException } from '@iam/roles/domain/exceptions/system-role-delete-forbidden.exception';
import { DeleteRoleCommandHandler } from './delete-role.handler';
import { RoleInUseException } from '@iam/roles/domain/exceptions/role-in-use.exception';

const role = (name: string) =>
  RoleEntity.register({ id: `role-${name}`, name });

describe('DeleteRoleCommandHandler', () => {
  const repository = {
    findById: jest.fn(),
    countAssignedUsers: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<RoleRepository>;
  const handler = new DeleteRoleCommandHandler(repository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(Object.values(SYSTEM_ROLES))(
    'rejects deletion of the %s system role',
    async (roleName) => {
      repository.findById.mockResolvedValue(role(roleName));

      const result = await handler.execute(
        new DeleteRoleCommand({ id: `role-${roleName}` }),
      );

      expect(result.isFailure).toBe(true);
      expect(result.getError()).toBeInstanceOf(
        SystemRoleDeleteForbiddenException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    },
  );

  it('deletes a custom role', async () => {
    repository.findById.mockResolvedValue(role('SUPPORT'));
    repository.countAssignedUsers.mockResolvedValue(0);
    repository.delete.mockResolvedValue(undefined);

    const result = await handler.execute(
      new DeleteRoleCommand({ id: 'role-SUPPORT' }),
    );

    expect(result.isSuccess).toBe(true);
    expect(repository.delete).toHaveBeenCalledWith('role-SUPPORT');
  });

  it('rejects deletion of a role assigned to users', async () => {
    repository.findById.mockResolvedValue(role('SUPPORT'));
    repository.countAssignedUsers.mockResolvedValue(2);

    const result = await handler.execute(
      new DeleteRoleCommand({ id: 'role-SUPPORT' }),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBeInstanceOf(RoleInUseException);
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
