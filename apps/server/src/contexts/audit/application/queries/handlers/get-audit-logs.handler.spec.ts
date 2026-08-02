import type { AuditLogReader } from '../../ports/audit-log-reader.port';
import { GetAuditLogsQuery } from '../get-audit-logs.query';
import { GetAuditLogsQueryHandler } from './get-audit-logs.handler';

describe('GetAuditLogsQueryHandler', () => {
  it('delegates normalized pagination to the read port', async () => {
    const reader: AuditLogReader = {
      findPage: jest.fn().mockResolvedValue({ logs: [], total: 0 }),
    };
    const handler = new GetAuditLogsQueryHandler(reader);

    await handler.execute(
      new GetAuditLogsQuery({
        page: 1,
        limit: 10,
        search: 'correlation-123',
      }),
    );

    expect(reader.findPage).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      search: 'correlation-123',
    });
  });
});
