import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { UpdateUserCommand } from '../update-user.command';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import type { UserRepository } from '@iam/users/domain/ports/user.repository';
import { Email } from '@iam/users/domain/value-objects/email.value-object';

@CommandHandler(UpdateUserCommand)
export class UpdateUserCommandHandler implements ICommandHandler<UpdateUserCommand, Result<void, DomainException>> {
    constructor(
        @Inject('UserRepository')
        private readonly userRepository: UserRepository,
    ) { }

    async execute(command: UpdateUserCommand): Promise<Result<void, DomainException>> {
        const { id, email, roles, updatedBy } = command;

        const user = await this.userRepository.findById(id);
        if (!user) {
            return Result.fail(new NotFoundException(`User with ID ${id} not found` as any));
        }

        const existing = await this.userRepository.findByEmail(email);
        if (existing && existing.id !== id) {
            return Result.fail(new ConflictException(`Email ${email} is already taken by another account` as any));
        }

        // Update fields
        // Since Email is a value object, we can update props inside entity using mapping or a domain method.
        // Let's see: we can set email directly if user has a method, or add updateInfo method.
        // Wait, UserEntity properties are private read-only in props interface, but let's see how we can update Email.
        // In UserEntity, we can add:
        // public updateInfo(email: string, updatedBy?: string) {
        //     this.props.email = new Email(email);
        //     this.trackUpdate(updatedBy);
        // }
        // Let's add that to user.entity.ts or do it in handler. Since properties are private/internal, let's check user.entity.ts structure.
        // UserEntity has `props` as private. So we MUST add a domain method `updateInfo(email: string, updatedBy?: string)` inside UserEntity!
        // That is the correct DDD way!
        
        user.updateInfo(email, updatedBy);
        user.updateRoles(roles, updatedBy);

        await this.userRepository.save(user);

        return Result.ok(undefined);
    }
}
