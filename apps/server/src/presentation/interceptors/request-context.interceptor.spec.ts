import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { defer, lastValueFrom } from 'rxjs';
import { getCorrelationId } from '@infrastructure/observability/correlation-context';
import { RequestContextInterceptor } from './request-context.interceptor';

describe('RequestContextInterceptor', () => {
  it('keeps correlation context active during the deferred RxJS subscription', async () => {
    const request = {
      header: jest.fn().mockReturnValue('correlation-123'),
      method: 'GET',
      originalUrl: '/test',
    };
    const response = {
      setHeader: jest.fn(),
      statusCode: 200,
    };
    const context = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
    const next = {
      handle: () => defer(async () => getCorrelationId()),
    } as CallHandler;

    const result = await lastValueFrom(
      new RequestContextInterceptor().intercept(context, next),
    );

    expect(result).toBe('correlation-123');
    expect(response.setHeader).toHaveBeenCalledWith(
      'x-correlation-id',
      'correlation-123',
    );
  });
});
