import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { BullModule } from '@nestjs/bullmq';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { BcryptPasswordHasher } from './infrastructure/services/bcrypt-password-hasher';
import { UserController } from './presentation/controllers/user.controller';
import { GetUsersQueryHandler } from './application/queries/handlers/get-users.handler';
import { GetUserByIdQueryHandler } from './application/queries/handlers/get-user-by-id.handler';
import { DeactivateUserCommandHandler } from './application/commands/handlers/deactivate-user.handler';
import { CreateUserCommandHandler } from './application/commands/handlers/create-user.handler';
import { DeleteUserCommandHandler } from './application/commands/handlers/delete-user.handler';
import { ActivateUserCommandHandler } from './application/commands/handlers/activate-user.handler';
import { UpdateUserCommandHandler } from './application/commands/handlers/update-user.handler';
import { USER_QUEUE } from './application/queues/user-queue.constants';
import { USER_REPOSITORY } from './domain/ports/user.repository';
import { PASSWORD_HASHER } from './application/ports/password-hasher.port';

@Module({
  // registerQueue chỉ tạo producer (đẩy job vào queue). Consumer
  // (UserQueueProcessor) chạy ở worker process riêng — xem worker.module.ts.
  imports: [CqrsModule, BullModule.registerQueue({ name: USER_QUEUE })],
  controllers: [UserController],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordHasher,
    },
    GetUsersQueryHandler,
    GetUserByIdQueryHandler,
    DeactivateUserCommandHandler,
    CreateUserCommandHandler,
    DeleteUserCommandHandler,
    ActivateUserCommandHandler,
    UpdateUserCommandHandler,
  ],
  exports: [USER_REPOSITORY, PASSWORD_HASHER, BullModule],
})
export class UsersModule {}
