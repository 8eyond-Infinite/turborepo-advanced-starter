import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';
import { MetricsTokenGuard } from './metrics-token.guard';

@Module({
  controllers: [MetricsController],
  providers: [MetricsService, HttpMetricsInterceptor, MetricsTokenGuard],
  exports: [MetricsService],
})
export class MetricsModule {}
