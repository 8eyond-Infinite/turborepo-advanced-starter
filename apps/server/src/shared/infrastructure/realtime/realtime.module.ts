import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CqrsModule } from '@nestjs/cqrs';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { UserDeactivatedRealtimeHandler } from './handlers/user-deactivated-realtime.handler';
import { REALTIME_PORT } from '../../domain/ports/realtime.port';

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
        {
            provide: REALTIME_PORT,
            useClass: RealtimeService,
        },
    ],
    exports: [
        RealtimeService,
        REALTIME_PORT,
    ],
})
export class RealtimeModule {}
