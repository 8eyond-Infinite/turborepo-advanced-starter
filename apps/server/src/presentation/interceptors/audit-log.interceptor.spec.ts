import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import type { AuditWriter } from '@/contexts/audit/application/ports/audit-writer.port';
import { runWithCorrelationId } from '@infrastructure/observability/correlation-context';
import { AuditLogInterceptor } from './audit-log.interceptor';

describe('AuditLogInterceptor', () => {
  it('persists the request correlation id with a successful audited action', async () => {
    const reflector = {
      get: jest
        .fn()
        .mockReturnValueOnce('USER_UPDATE')
        .mockReturnValueOnce(undefined),
    } as unknown as Reflector;
    const auditWriter = {
      write: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AuditWriter>;
    const request = {
      user: { id: 'admin-id', email: 'admin@example.com' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'test-agent' },
    };
    const context = {
      getHandler: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    const next = { handle: () => of({ id: 'user-id' }) } as CallHandler;
    const interceptor = new AuditLogInterceptor(reflector, auditWriter);

    await runWithCorrelationId('correlation-123', () =>
      lastValueFrom(interceptor.intercept(context, next)),
    );

    expect(auditWriter.write).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'USER_UPDATE',
        userId: 'admin-id',
        correlationId: 'correlation-123',
      }),
    );
  });
});
