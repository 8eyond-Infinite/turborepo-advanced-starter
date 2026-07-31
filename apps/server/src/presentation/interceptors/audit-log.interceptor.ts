import {
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import {
  AUDIT_LOG_ACTION_KEY,
  AUDIT_LOG_DETAILS_CALLBACK_KEY,
} from '../decorators/audit-log.decorator';
import {
  AUDIT_WRITER,
  type AuditWriter,
} from '@/contexts/audit/application/ports/audit-writer.port';
import type { AuthenticatedRequest } from '../http/authenticated-request';
import { getCorrelationId } from '@infrastructure/observability/correlation-context';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject(AUDIT_WRITER)
    private readonly auditWriter: AuditWriter,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const handler = context.getHandler();

    const action = this.reflector.get<string>(AUDIT_LOG_ACTION_KEY, handler);
    if (!action) {
      return next.handle();
    }

    const getDetails = this.reflector.get<
      (request: AuthenticatedRequest, response: unknown) => string
    >(AUDIT_LOG_DETAILS_CALLBACK_KEY, handler);

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return next.handle().pipe(
      mergeMap(async (response: unknown) => {
        try {
          const actor = request.user;
          const ip =
            request.ip ||
            request.headers['x-forwarded-for'] ||
            request.connection?.remoteAddress ||
            '';
          const userAgent = request.headers['user-agent'] || '';

          let details = '';
          if (getDetails) {
            try {
              details = getDetails(request, response);
            } catch {
              details = `${action} performed successfully.`;
            }
          } else {
            details = `${action} performed successfully.`;
          }

          await this.auditWriter.write({
            action,
            details,
            userId: actor?.id || null,
            userEmail: actor?.email || null,
            ip: typeof ip === 'string' ? ip : JSON.stringify(ip),
            userAgent,
            correlationId: getCorrelationId() ?? null,
          });
        } catch (error) {
          this.logger.error(
            'Failed to persist audit log',
            error instanceof Error ? error.stack : String(error),
          );
        }
        return response;
      }),
    );
  }
}
