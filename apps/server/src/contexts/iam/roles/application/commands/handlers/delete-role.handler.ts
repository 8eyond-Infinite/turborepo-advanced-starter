import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { DeleteRoleCommand } from '../delete-role.command';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import type { RoleRepository } from '@iam/roles/domain/ports/role.repository';

@CommandHandler(DeleteRoleCommand)
export class DeleteRoleCommandHandler implements ICommandHandler<DeleteRoleCommand, Result<void, DomainException>> {
    constructor(
        @Inject('RoleRepository')
        private readonly roleRepository: RoleRepository,
    ) { }

    async execute(command: DeleteRoleCommand): Promise<Result<void, DomainException>> {
        const { id } = command;

        const role = await this.roleRepository.findById(id);
        if (!role) {
            return Result.fail(new NotFoundException(`Role with ID ${id} not found` as any));
        }

        await this.roleRepository.delete(id);

        return Result.ok(undefined);
    }
}
