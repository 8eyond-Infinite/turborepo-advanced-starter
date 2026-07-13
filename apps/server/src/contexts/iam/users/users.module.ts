import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { BullModule } from '@nestjs/bullmq';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { BcryptPasswordHasher } from './infrastructure/services/bcrypt-password-hasher';
import { UserController } from './presentation/controllers/user.controller';
import { GetUsersQueryHandler } from './application/queries/handlers/get-users.handler';
import { GetUserByIdQueryHandler } from './application/queries/handlers/get-user-by-id.handler';
import { USER_QUEUE } from './application/queues/user-queue.constants';
import { UserQueueProcessor } from './application/queues/user-queue.processor';
import { UserRegisteredEventHandler } from './application/events/handlers/user-registered.event-handler';

@Module({
    imports: [
        CqrsModule,
        BullModule.registerQueue({ name: USER_QUEUE }),
    ],
    controllers: [UserController],
    providers: [
        {
            provide: 'UserRepository',
            useClass: PrismaUserRepository,
        },
        {
            provide: 'PasswordHasher',
            useClass: BcryptPasswordHasher,
        },
        GetUsersQueryHandler,
        GetUserByIdQueryHandler,
        UserQueueProcessor,
        UserRegisteredEventHandler,
    ],
    exports: ['UserRepository', 'PasswordHasher', BullModule],
})
export class UsersModule { }