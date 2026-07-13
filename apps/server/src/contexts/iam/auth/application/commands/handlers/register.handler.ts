import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { RegisterCommand } from '../register.command';
import { UserEntity } from '@iam/users/domain/user.entity';
import { UserAlreadyExistsException } from '@iam/users/domain/exceptions/user-already-exists.exception';
import * as crypto from 'crypto';
import { USER_QUEUE, USER_JOBS } from '@iam/users/application/queues/user-queue.constants';

import type { UserRepository } from '@iam/users/domain/ports/user.repository';
import type { PasswordHasher } from '@iam/users/domain/ports/password-hasher';

@CommandHandler(RegisterCommand)
export class RegisterHandler implements ICommandHandler<RegisterCommand> {
    constructor(
        @Inject('UserRepository')
        private readonly userRepository: UserRepository,
        @Inject('PasswordHasher')
        private readonly passwordHasher: PasswordHasher,
        @InjectQueue(USER_QUEUE)
        private readonly userQueue: Queue,
    ) { }

    async execute(command: RegisterCommand): Promise<void> {
        const { email, passwordRaw } = command;

        const existingUser = await this.userRepository.findByEmail(email);
        if (existingUser) {
            throw new UserAlreadyExistsException(email);
        }

        const passwordHash = await this.passwordHasher.hash(passwordRaw);

        const user = UserEntity.register({
            id: crypto.randomUUID(),
            email,
            passwordHash,
        });

        await this.userRepository.save(user);

        await this.userQueue.add(USER_JOBS.SEND_WELCOME_EMAIL, { email });
    }
}