import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { Observable, finalize } from 'rxjs';
import type { AuthenticatedRequest } from '../http/authenticated-request';
import { runWithCorrelationId } from '@infrastructure/observability/correlation-context';

const CORRELATION_ID_HEADER = 'x-correlation-id';
const MAX_CORRELATION_ID_LENGTH = 128;
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestContextInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const response = http.getResponse<Response>();
    const correlationId = this.resolveCorrelationId(
      request.header(CORRELATION_ID_HEADER),
    );
    const startedAt = performance.now();

    response.setHeader(CORRELATION_ID_HEADER, correlationId);

    // Nest subscribes after intercept() returns. Creating an Observable inside
    // AsyncLocalStorage is therefore not enough: the actual RxJS work must be
    // subscribed while the context is active so every async descendant sees
    // the same correlation id.
    return new Observable((subscriber) =>
      runWithCorrelationId(correlationId, () =>
        this.handleWithContext(next, {
          correlationId,
          request,
          response,
          startedAt,
        }).subscribe(subscriber),
      ),
    );
  }

  private handleWithContext(
    next: CallHandler,
    ctx: {
      correlationId: string;
      request: AuthenticatedRequest;
      response: Response;
      startedAt: number;
    },
  ): Observable<unknown> {
    const { correlationId, request, response, startedAt } = ctx;

    return next.handle().pipe(
      finalize(() => {
        this.logger.log({
          message: 'HTTP request completed',
          correlationId,
          method: request.method,
          path: request.originalUrl,
          statusCode: response.statusCode,
          durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
          userId: request.user?.id,
        });
      }),
    );
  }

  private resolveCorrelationId(candidate: string | undefined): string {
    const normalized = candidate?.trim();
    if (
      normalized &&
      normalized.length > 0 &&
      normalized.length <= MAX_CORRELATION_ID_LENGTH
    ) {
      return normalized;
    }
    return randomUUID();
  }
}
