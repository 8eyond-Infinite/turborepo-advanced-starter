import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { DeleteUserCommand } from '../delete-user.command';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import type { UserRepository } from '@iam/users/domain/ports/user.repository';

@CommandHandler(DeleteUserCommand)
export class DeleteUserCommandHandler implements ICommandHandler<DeleteUserCommand, Result<void, DomainException>> {
    constructor(
        @Inject('UserRepository')
        private readonly userRepository: UserRepository,
    ) { }

    async execute(command: DeleteUserCommand): Promise<Result<void, DomainException>> {
        const { id, adminId } = command;

        const user = await this.userRepository.findById(id);
        if (!user) {
            return Result.fail(new NotFoundException(`User with ID ${id} not found` as any));
        }

        user.softDelete(adminId);
        await this.userRepository.save(user);

        return Result.ok(undefined);
    }
}
