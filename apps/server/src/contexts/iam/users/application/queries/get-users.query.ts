import { IQuery } from '@nestjs/cqrs';
import type { UserSortField } from '../../domain/ports/user.repository';

export class GetUsersQuery implements IQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 10,
    public readonly search?: string,
    public readonly sortBy?: UserSortField,
    public readonly sortOrder: 'asc' | 'desc' = 'desc',
  ) {}
}
