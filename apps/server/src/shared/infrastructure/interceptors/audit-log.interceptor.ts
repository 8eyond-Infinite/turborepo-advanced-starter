import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';
import { AUDIT_LOG_ACTION_KEY, AUDIT_LOG_DETAILS_CALLBACK_KEY } from '../decorators/audit-log.decorator';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly prisma: PrismaService,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const handler = context.getHandler();
        
        const action = this.reflector.get<string>(AUDIT_LOG_ACTION_KEY, handler);
        if (!action) {
            return next.handle();
        }

        const getDetails = this.reflector.get<(req: any, res: any) => string>(
            AUDIT_LOG_DETAILS_CALLBACK_KEY,
            handler,
        );

        const request = context.switchToHttp().getRequest();

        return next.handle().pipe(
            tap(async (response) => {
                try {
                    const actor = request.user;
                    const ip = request.ip || request.headers['x-forwarded-for'] || request.connection?.remoteAddress || '';
                    const userAgent = request.headers['user-agent'] || '';

                    let details = '';
                    if (getDetails) {
                        try {
                            details = getDetails(request, response);
                        } catch (err) {
                            details = `${action} performed successfully.`;
                        }
                    } else {
                        details = `${action} performed successfully.`;
                    }

                    await this.prisma.auditLog.create({
                        data: {
                            action,
                            details,
                            userId: actor?.id || null,
                            userEmail: actor?.email || null,
                            ip: typeof ip === 'string' ? ip : JSON.stringify(ip),
                            userAgent,
                        },
                    });
                } catch (error) {
                    // Suppress audit log creation failures to avoid crashing the main application flow
                    console.error('Failed to create audit log:', error);
                }
            }),
        );
    }
}
