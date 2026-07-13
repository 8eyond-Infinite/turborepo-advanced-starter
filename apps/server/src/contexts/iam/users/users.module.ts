import { Module } from '@nestjs/common';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { BcryptPasswordHasher } from './infrastructure/services/bcrypt-password-hasher';

@Module({
    providers: [
        {
            provide: 'UserRepository',
            useClass: PrismaUserRepository,
        },
        {
            provide: 'PasswordHasher',
            useClass: BcryptPasswordHasher,
        },
    ],
    exports: ['UserRepository', 'PasswordHasher'],
})
export class UsersModule { }