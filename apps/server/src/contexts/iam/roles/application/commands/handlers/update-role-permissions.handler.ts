import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { UpdateRolePermissionsCommand } from '../update-role-permissions.command';
import { RoleEntity } from '@iam/roles/domain/role.entity';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { RoleNotFoundException } from '@iam/roles/domain/exceptions/role-not-found.exception';
import { InvalidRolePermissionsException } from '@iam/roles/domain/exceptions/invalid-role-permissions.exception';
import {
  ROLE_REPOSITORY,
  type RoleRepository,
} from '@iam/roles/domain/ports/role.repository';

@CommandHandler(UpdateRolePermissionsCommand)
export class UpdateRolePermissionsCommandHandler implements ICommandHandler<
  UpdateRolePermissionsCommand,
  Result<RoleEntity, DomainException>
> {
  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: RoleRepository,
  ) {}

  async execute(
    command: UpdateRolePermissionsCommand,
  ): Promise<Result<RoleEntity, DomainException>> {
    const { id, permissions, updatedBy } = command;

    const role = await this.roleRepository.findById(id);
    if (!role) {
      return Result.fail(new RoleNotFoundException(id));
    }

    const requestedPermissions = [...new Set(permissions)];
    const existingPermissionNames =
      await this.roleRepository.findExistingPermissionNames(
        requestedPermissions,
      );
    const existingPermissionSet = new Set(existingPermissionNames);
    const unknownPermissions = requestedPermissions.filter(
      (permission) => !existingPermissionSet.has(permission),
    );
    if (unknownPermissions.length > 0) {
      return Result.fail(
        new InvalidRolePermissionsException(unknownPermissions),
      );
    }

    role.updatePermissions(requestedPermissions, updatedBy);
    await this.roleRepository.replacePermissionsAndRevokeAffectedUsers(role);

    return Result.ok(role);
  }
}
