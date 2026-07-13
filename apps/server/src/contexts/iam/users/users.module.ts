import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { BcryptPasswordHasher } from './infrastructure/services/bcrypt-password-hasher';
import { UserController } from './presentation/controllers/user.controller';
import { GetUsersQueryHandler } from './application/queries/handlers/get-users.handler';
import { GetUserByIdQueryHandler } from './application/queries/handlers/get-user-by-id.handler';

@Module({
    imports: [CqrsModule],
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
    ],
    exports: ['UserRepository', 'PasswordHasher'],
})
export class UsersModule { }