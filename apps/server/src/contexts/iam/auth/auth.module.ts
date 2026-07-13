import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { BullModule } from '@nestjs/bullmq';
import { RegisterHandler } from './application/commands/handlers/register.handler';
import { LoginQueryHandler } from './application/queries/handlers/login.handler';
import { RefreshQueryHandler } from './application/queries/handlers/refresh.handler';
import { UsersModule } from '../users/users.module';
import { AuthController } from './presentation/controllers/auth.controller';
import { JwtStrategy } from './application/strategies/jwt.strategy';
import { JwtRefreshStrategy } from './application/strategies/jwt-refresh.strategy';
import { USER_QUEUE } from '@iam/users/application/queues/user-queue.constants';
import { UserQueueProcessor } from '@iam/users/application/queues/user-queue.processor';

@Module({
    imports: [
        CqrsModule,
        UsersModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({}),
        BullModule.registerQueue({ name: USER_QUEUE }),
    ],
    controllers: [AuthController],
    providers: [
        RegisterHandler,
        LoginQueryHandler,
        RefreshQueryHandler,
        JwtStrategy,
        JwtRefreshStrategy,
        UserQueueProcessor,
    ],
    exports: [PassportModule, JwtStrategy, JwtRefreshStrategy],
})
export class AuthModule { }