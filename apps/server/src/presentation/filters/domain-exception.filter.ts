import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { Response } from 'express';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
    catch(exception: DomainException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const message = exception.message;

        const error = exception.error;
        const status = error.statusCode;

        response.status(status).json({
            statusCode: status,
            code: error.code,
            translationKey: error.translationKey,
            message: message,
            args: exception.args || {},
            error: exception.name,
            timestamp: new Date().toISOString(),
        });
    }
}
