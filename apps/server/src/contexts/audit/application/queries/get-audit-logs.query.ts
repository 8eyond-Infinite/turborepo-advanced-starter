import { IQuery } from '@nestjs/cqrs';

export class GetAuditLogsQuery implements IQuery {
  constructor(
    public readonly pagination: {
      page?: number;
      limit?: number;
      search?: string;
    },
  ) {}
}
