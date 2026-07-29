import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { CreateRoleCommand } from '../create-role.command';
import { RoleEntity } from '@iam/roles/domain/role.entity';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { RoleAlreadyExistsException } from '@iam/roles/domain/exceptions/role-already-exists.exception';
import {
  ROLE_REPOSITORY,
  type RoleRepository,
} from '@iam/roles/domain/ports/role.repository';
import { PERMISSIONS } from '@repo/contracts';

@CommandHandler(CreateRoleCommand)
export class CreateRoleCommandHandler implements ICommandHandler<
  CreateRoleCommand,
  Result<RoleEntity, DomainException>
> {
  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: RoleRepository,
  ) {}

  async execute(
    command: CreateRoleCommand,
  ): Promise<Result<RoleEntity, DomainException>> {
    const { name, description, createdBy } = command;

    const existing = await this.roleRepository.findByName(name);
    if (existing) {
      return Result.fail(new RoleAlreadyExistsException(name));
    }

    const role = RoleEntity.register({
      id: this.roleRepository.nextIdentity(),
      name,
      description,
      permissions: [PERMISSIONS.USER.READ],
      createdBy,
    });

    await this.roleRepository.save(role);

    return Result.ok(role);
  }
}
