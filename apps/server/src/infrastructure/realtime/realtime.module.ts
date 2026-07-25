import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { REALTIME_PORT } from '@shared/application/ports/realtime.port';

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [
    RealtimeGateway,
    RealtimeService,
    {
      provide: REALTIME_PORT,
      useClass: RealtimeService,
    },
  ],
  exports: [RealtimeService, REALTIME_PORT],
})
export class RealtimeModule {}
