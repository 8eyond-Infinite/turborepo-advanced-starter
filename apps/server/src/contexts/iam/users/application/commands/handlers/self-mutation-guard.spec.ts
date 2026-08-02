import type { UserRepository } from '@iam/users/domain/ports/user.repository';
import { UserSelfMutationForbiddenException } from '@iam/users/domain/exceptions/user-self-mutation-forbidden.exception';
import { DeactivateUserCommand } from '../deactivate-user.command';
import { DeleteUserCommand } from '../delete-user.command';
import { ActivateUserCommand } from '../activate-user.command';
import { DeactivateUserCommandHandler } from './deactivate-user.handler';
import { DeleteUserCommandHandler } from './delete-user.handler';
import { ActivateUserCommandHandler } from './activate-user.handler';

describe('user self-mutation guard', () => {
  const repository = {
    findById: jest.fn(),
    save: jest.fn(),
  } as unknown as jest.Mocked<UserRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    {
      name: 'deactivate',
      handler: new DeactivateUserCommandHandler(repository),
      command: new DeactivateUserCommand({
        id: 'admin-id',
        adminId: 'admin-id',
      }),
    },
    {
      name: 'activate',
      handler: new ActivateUserCommandHandler(repository),
      command: new ActivateUserCommand({
        id: 'admin-id',
        adminId: 'admin-id',
      }),
    },
    {
      name: 'delete',
      handler: new DeleteUserCommandHandler(repository),
      command: new DeleteUserCommand({
        id: 'admin-id',
        adminId: 'admin-id',
      }),
    },
  ])(
    'rejects an administrator attempting to $name themselves',
    async ({ handler, command }) => {
      const result = await handler.execute(command as never);

      expect(result.isFailure).toBe(true);
      expect(result.getError()).toBeInstanceOf(
        UserSelfMutationForbiddenException,
      );
      expect(repository.findById).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    },
  );
});
