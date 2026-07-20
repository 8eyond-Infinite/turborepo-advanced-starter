import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CqrsModule } from '@nestjs/cqrs';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { UserDeactivatedRealtimeHandler } from './handlers/user-deactivated-realtime.handler';

@Global()
@Module({
    imports: [
        JwtModule.register({}),
        CqrsModule,
    ],
    providers: [
        RealtimeGateway,
        RealtimeService,
        UserDeactivatedRealtimeHandler,
    ],
    exports: [
        RealtimeService,
    ],
})
export class RealtimeModule {}
