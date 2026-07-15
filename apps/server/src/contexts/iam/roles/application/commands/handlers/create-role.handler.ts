import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, ConflictException } from '@nestjs/common';
import { CreateRoleCommand } from '../create-role.command';
import { RoleEntity } from '@iam/roles/domain/role.entity';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import type { RoleRepository } from '@iam/roles/domain/ports/role.repository';

@CommandHandler(CreateRoleCommand)
export class CreateRoleCommandHandler implements ICommandHandler<CreateRoleCommand, Result<RoleEntity, DomainException>> {
    constructor(
        @Inject('RoleRepository')
        private readonly roleRepository: RoleRepository,
    ) { }

    async execute(command: CreateRoleCommand): Promise<Result<RoleEntity, DomainException>> {
        const { name, description, createdBy } = command;

        const existing = await this.roleRepository.findByName(name);
        if (existing) {
            return Result.fail(new ConflictException(`Role with name ${name} already exists` as any));
        }

        const role = RoleEntity.register({
            id: this.roleRepository.nextIdentity(),
            name,
            description,
            permissions: ['user:read'], // Give default read permissions to new roles
            createdBy,
        });

        await this.roleRepository.save(role);

        return Result.ok(role);
    }
}
