import type { UserRepository } from '@iam/users/domain/ports/user.repository';
import { LastAdministratorRequiredException } from '@iam/users/domain/exceptions/last-administrator-required.exception';
import { UserEntity } from '@iam/users/domain/user.entity';
import { UpdateUserCommand } from '../update-user.command';
import { DeactivateUserCommand } from '../deactivate-user.command';
import { DeleteUserCommand } from '../delete-user.command';
import { UpdateUserCommandHandler } from './update-user.handler';
import { DeactivateUserCommandHandler } from './deactivate-user.handler';
import { DeleteUserCommandHandler } from './delete-user.handler';

describe('last administrator application guard', () => {
  const createAdministrator = () =>
    UserEntity.register({
      id: 'last-admin-id',
      email: 'admin@example.com',
      username: 'admin',
      passwordHash: 'hashed-password',
      roles: ['ADMIN'],
    });

  const createRepository = (user: UserEntity) =>
    ({
      findById: jest.fn().mockResolvedValue(user),
      findByEmail: jest.fn().mockResolvedValue(user),
      findExistingRoleNames: jest.fn().mockResolvedValue(['USER']),
      savePreservingLastAdministrator: jest.fn().mockResolvedValue(false),
    }) as unknown as jest.Mocked<UserRepository>;

  it.each([
    {
      name: 'remove the ADMIN role',
      createHandler: (repository: UserRepository) =>
        new UpdateUserCommandHandler(repository),
      command: new UpdateUserCommand({
        id: 'last-admin-id',
        email: 'admin@example.com',
        username: 'admin',
        roles: ['USER'],
        updatedBy: 'last-admin-id',
      }),
    },
    {
      name: 'deactivate the account',
      createHandler: (repository: UserRepository) =>
        new DeactivateUserCommandHandler(repository),
      command: new DeactivateUserCommand({
        id: 'last-admin-id',
        adminId: 'operator-id',
      }),
    },
    {
      name: 'delete the account',
      createHandler: (repository: UserRepository) =>
        new DeleteUserCommandHandler(repository),
      command: new DeleteUserCommand({
        id: 'last-admin-id',
        adminId: 'operator-id',
      }),
    },
  ])('rejects an attempt to $name', async ({ createHandler, command }) => {
    const repository = createRepository(createAdministrator());
    const result = await createHandler(repository).execute(command as never);

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBeInstanceOf(
      LastAdministratorRequiredException,
    );
    expect(repository.savePreservingLastAdministrator).toHaveBeenCalledTimes(1);
  });
});
