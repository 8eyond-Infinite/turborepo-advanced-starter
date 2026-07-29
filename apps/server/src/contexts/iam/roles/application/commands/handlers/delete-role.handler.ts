import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { DeleteRoleCommand } from '../delete-role.command';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { RoleNotFoundException } from '@iam/roles/domain/exceptions/role-not-found.exception';
import { SystemRoleDeleteForbiddenException } from '@iam/roles/domain/exceptions/system-role-delete-forbidden.exception';
import { RoleInUseException } from '@iam/roles/domain/exceptions/role-in-use.exception';
import { isSystemRole } from '@repo/contracts';
import {
  ROLE_REPOSITORY,
  type RoleRepository,
} from '@iam/roles/domain/ports/role.repository';

@CommandHandler(DeleteRoleCommand)
export class DeleteRoleCommandHandler implements ICommandHandler<
  DeleteRoleCommand,
  Result<void, DomainException>
> {
  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: RoleRepository,
  ) {}

  async execute(
    command: DeleteRoleCommand,
  ): Promise<Result<void, DomainException>> {
    const { id } = command;

    const role = await this.roleRepository.findById(id);
    if (!role) {
      return Result.fail(new RoleNotFoundException(id));
    }

    if (isSystemRole(role.name)) {
      return Result.fail(new SystemRoleDeleteForbiddenException(role.name));
    }

    const assignedUserCount = await this.roleRepository.countAssignedUsers(id);
    if (assignedUserCount > 0) {
      return Result.fail(new RoleInUseException(role.name, assignedUserCount));
    }

    await this.roleRepository.delete(id);

    return Result.ok(undefined);
  }
}
