import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { ToggleUserStatusCommand } from '../toggle-user-status.command';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import type { UserRepository } from '@iam/users/domain/ports/user.repository';

@CommandHandler(ToggleUserStatusCommand)
export class ToggleUserStatusCommandHandler implements ICommandHandler<ToggleUserStatusCommand, Result<void, DomainException>> {
    constructor(
        @Inject('UserRepository')
        private readonly userRepository: UserRepository,
    ) { }

    async execute(command: ToggleUserStatusCommand): Promise<Result<void, DomainException>> {
        const { id, adminId } = command;

        const user = await this.userRepository.findById(id);
        if (!user) {
            return Result.fail(new NotFoundException(`User with ID ${id} not found` as any));
        }

        if (user.isActive) {
            user.deactivate(adminId);
        } else {
            user.activate(adminId);
        }

        await this.userRepository.save(user);

        return Result.ok(undefined);
    }
}
