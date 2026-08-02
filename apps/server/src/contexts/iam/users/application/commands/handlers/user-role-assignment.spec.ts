import type { PasswordHasher } from '@iam/users/application/ports/password-hasher.port';
import type { UserRepository } from '@iam/users/domain/ports/user.repository';
import { InvalidUserRolesException } from '@iam/users/domain/exceptions/invalid-user-roles.exception';
import { UserEntity } from '@iam/users/domain/user.entity';
import { CreateUserCommand } from '../create-user.command';
import { UpdateUserCommand } from '../update-user.command';
import { CreateUserCommandHandler } from './create-user.handler';
import { UpdateUserCommandHandler } from './update-user.handler';

describe('user role assignment validation', () => {
  const passwordHasher = {
    hash: jest.fn().mockResolvedValue('hashed-password'),
  } as unknown as jest.Mocked<PasswordHasher>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects an unknown role before hashing or creating a user', async () => {
    const repository = {
      findByEmail: jest.fn().mockResolvedValue(null),
      findExistingRoleNames: jest.fn().mockResolvedValue(['USER']),
      nextIdentity: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;
    const handler = new CreateUserCommandHandler(repository, passwordHasher);

    const result = await handler.execute(
      new CreateUserCommand({
        email: 'member@example.com',
        username: 'member',
        passwordHash: 'password123',
        roles: ['USER', 'MISSING'],
      }),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBeInstanceOf(InvalidUserRolesException);
    expect(result.getError().args).toEqual({ unknownRoles: ['MISSING'] });
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects an empty replacement without mutating the existing user', async () => {
    const user = UserEntity.register({
      id: 'member-id',
      email: 'member@example.com',
      username: 'member',
      passwordHash: 'hashed-password',
      roles: ['USER'],
    });
    const repository = {
      findById: jest.fn().mockResolvedValue(user),
      findByEmail: jest.fn().mockResolvedValue(user),
      findExistingRoleNames: jest.fn().mockResolvedValue([]),
      savePreservingLastAdministrator: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;
    const handler = new UpdateUserCommandHandler(repository);

    const result = await handler.execute(
      new UpdateUserCommand({
        id: 'member-id',
        email: 'changed@example.com',
        username: 'changed',
        roles: [],
      }),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBeInstanceOf(InvalidUserRolesException);
    expect(user.email).toBe('member@example.com');
    expect(user.roles).toEqual(['USER']);
    expect(repository.savePreservingLastAdministrator).not.toHaveBeenCalled();
  });

  it('deduplicates a fully valid replacement before saving', async () => {
    const user = UserEntity.register({
      id: 'member-id',
      email: 'member@example.com',
      username: 'member',
      passwordHash: 'hashed-password',
      roles: ['USER'],
    });
    const repository = {
      findById: jest.fn().mockResolvedValue(user),
      findByEmail: jest.fn().mockResolvedValue(user),
      findExistingRoleNames: jest.fn().mockResolvedValue(['USER', 'SUPPORT']),
      savePreservingLastAdministrator: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<UserRepository>;
    const handler = new UpdateUserCommandHandler(repository);

    const result = await handler.execute(
      new UpdateUserCommand({
        id: 'member-id',
        email: 'member@example.com',
        username: 'member',
        roles: ['USER', 'SUPPORT', 'SUPPORT'],
      }),
    );

    expect(result.isSuccess).toBe(true);
    expect(repository.findExistingRoleNames).toHaveBeenCalledWith([
      'USER',
      'SUPPORT',
    ]);
    expect(user.roles).toEqual(['USER', 'SUPPORT']);
  });
});
