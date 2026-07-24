import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CqrsModule } from '@nestjs/cqrs';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { RealtimeEventBridge } from '@infrastructure/event-bus/bridges/realtime.bridge';
import { REALTIME_PORT } from '@shared/domain/ports/realtime.port';

@Global()
@Module({
    imports: [
        JwtModule.register({}),
        CqrsModule,
    ],
    providers: [
        RealtimeGateway,
        RealtimeService,
        RealtimeEventBridge,
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
