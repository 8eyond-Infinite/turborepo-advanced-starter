import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, finalize } from 'rxjs';
import { MetricsService } from './metrics.service';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    // Label with the route template, never the raw URL — raw paths (ids,
    // scanner noise) would explode label cardinality. express types route as
    // `any`, hence the explicit shape cast.
    const routePath = (request.route as { path?: unknown } | undefined)?.path;
    const route = typeof routePath === 'string' ? routePath : 'unmatched';
    if (route === '/metrics') {
      return next.handle();
    }

    const stopTimer = this.metricsService.httpRequestDuration.startTimer({
      method: request.method,
      route,
    });

    return next.handle().pipe(
      finalize(() => {
        stopTimer({ status_code: String(response.statusCode) });
      }),
    );
  }
}
