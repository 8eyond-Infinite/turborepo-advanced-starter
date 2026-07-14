import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { DeactivateUserCommand } from '../deactivate-user.command';
import { UserNotFoundException } from '@iam/users/domain/exceptions/user-not-found.exception';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { DomainEventDispatcher } from '@shared/application/events/domain-event-dispatcher';
import type { UserRepository } from '@iam/users/domain/ports/user.repository';

@CommandHandler(DeactivateUserCommand)
export class DeactivateUserCommandHandler implements ICommandHandler<DeactivateUserCommand, Result<void, DomainException>> {
    constructor(
        @Inject('UserRepository')
        private readonly userRepository: UserRepository,
        private readonly domainEventDispatcher: DomainEventDispatcher,
    ) { }

    async execute(command: DeactivateUserCommand): Promise<Result<void, DomainException>> {
        const { id, adminId } = command;

        const user = await this.userRepository.findById(id);
        if (!user) {
            return Result.fail(new UserNotFoundException(id));
        }

        user.deactivate(adminId);
        await this.userRepository.save(user);

        // Dispatch domain events (UserDeactivatedEvent)
        await this.domainEventDispatcher.dispatch(user);

        return Result.ok(undefined);
    }
}
