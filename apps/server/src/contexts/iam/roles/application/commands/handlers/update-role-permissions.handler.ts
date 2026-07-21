import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { UpdateRolePermissionsCommand } from '../update-role-permissions.command';
import { RoleEntity } from '@iam/roles/domain/role.entity';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { RoleNotFoundException } from '@iam/roles/domain/exceptions/role-not-found.exception';
import type { RoleRepository } from '@iam/roles/domain/ports/role.repository';

@CommandHandler(UpdateRolePermissionsCommand)
export class UpdateRolePermissionsCommandHandler implements ICommandHandler<UpdateRolePermissionsCommand, Result<RoleEntity, DomainException>> {
    constructor(
        @Inject('RoleRepository')
        private readonly roleRepository: RoleRepository,
    ) { }

    async execute(command: UpdateRolePermissionsCommand): Promise<Result<RoleEntity, DomainException>> {
        const { id, permissions, updatedBy } = command;

        const role = await this.roleRepository.findById(id);
        if (!role) {
            return Result.fail(new RoleNotFoundException(id));
        }

        role.updatePermissions(permissions, updatedBy);
        await this.roleRepository.save(role);

        return Result.ok(role);
    }
}
