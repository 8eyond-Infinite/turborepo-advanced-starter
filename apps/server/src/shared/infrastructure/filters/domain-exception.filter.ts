import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { UserAlreadyExistsException } from '@iam/users/domain/exceptions/user-already-exists.exception';
import { InvalidCredentialsException } from '@iam/users/domain/exceptions/invalid-credentials.exception';
import { UserDeactivatedException } from '@iam/users/domain/exceptions/user-deactivated.exception';

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
    catch(exception: DomainException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const message = exception.message;

        let status = HttpStatus.BAD_REQUEST;

        if (exception instanceof UserAlreadyExistsException) {
            status = HttpStatus.CONFLICT;
        } else if (exception instanceof InvalidCredentialsException) {
            status = HttpStatus.UNAUTHORIZED;
        } else if (exception instanceof UserDeactivatedException) {
            status = HttpStatus.FORBIDDEN;
        }

        const code = exception.name.replace(/Exception$/, '').replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();
        const translationKey = `exceptions.${exception.name.replace(/Exception$/, '').replace(/([a-z0-9])([A-Z])/g, '$1.$2').toLowerCase()}`;

        response.status(status).json({
            statusCode: status,
            code: code,
            translationKey: translationKey,
            message: message,
            args: exception.args || {},
            error: exception.name,
            timestamp: new Date().toISOString(),
        });
    }
}
