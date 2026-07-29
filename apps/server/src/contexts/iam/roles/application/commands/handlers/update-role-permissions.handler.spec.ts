import type { RoleRepository } from '@iam/roles/domain/ports/role.repository';
import { InvalidRolePermissionsException } from '@iam/roles/domain/exceptions/invalid-role-permissions.exception';
import { RoleEntity } from '@iam/roles/domain/role.entity';
import { UpdateRolePermissionsCommand } from '../update-role-permissions.command';
import { UpdateRolePermissionsCommandHandler } from './update-role-permissions.handler';

describe('UpdateRolePermissionsCommandHandler', () => {
  const repository = {
    findById: jest.fn(),
    findExistingPermissionNames: jest.fn(),
    replacePermissionsAndRevokeAffectedUsers: jest.fn(),
  } as unknown as jest.Mocked<RoleRepository>;
  const handler = new UpdateRolePermissionsCommandHandler(repository);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findById.mockResolvedValue(
      RoleEntity.register({
        id: 'role-id',
        name: 'SUPPORT',
        permissions: ['user:read'],
      }),
    );
  });

  it('rejects the whole replacement when any permission is unknown', async () => {
    repository.findExistingPermissionNames.mockResolvedValue(['user:read']);

    const result = await handler.execute(
      new UpdateRolePermissionsCommand({
        id: 'role-id',
        permissions: ['user:read', 'user:reed'],
        updatedBy: 'admin-id',
      }),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBeInstanceOf(InvalidRolePermissionsException);
    expect(result.getError().args).toEqual({
      permissionNames: ['user:reed'],
    });
    expect(
      repository.replacePermissionsAndRevokeAffectedUsers,
    ).not.toHaveBeenCalled();
  });

  it('deduplicates and saves a fully valid permission set', async () => {
    repository.findExistingPermissionNames.mockResolvedValue([
      'user:read',
      'user:update',
    ]);

    const result = await handler.execute(
      new UpdateRolePermissionsCommand({
        id: 'role-id',
        permissions: ['user:read', 'user:update', 'user:read'],
        updatedBy: 'admin-id',
      }),
    );

    expect(result.unwrap().permissions).toEqual(['user:read', 'user:update']);
    expect(
      repository.replacePermissionsAndRevokeAffectedUsers,
    ).toHaveBeenCalledTimes(1);
  });
});
