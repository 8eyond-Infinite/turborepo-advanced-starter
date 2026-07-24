import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface ClientInfo {
    ip: string;
    userAgent: string;
}

export const ClientInfo = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): ClientInfo => {
        const request = ctx.switchToHttp().getRequest<Request>();
        
        const forwarded = request.headers['x-forwarded-for'];
        const ip = typeof forwarded === 'string'
            ? forwarded.split(',')[0].trim()
            : request.ip || request.socket.remoteAddress || '127.0.0.1';

        const userAgent = request.headers['user-agent'] || 'unknown';

        return { ip, userAgent };
    },
);
