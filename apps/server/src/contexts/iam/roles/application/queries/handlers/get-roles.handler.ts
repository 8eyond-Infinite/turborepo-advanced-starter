import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetRolesQuery } from '../get-roles.query';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import {
  ROLE_REPOSITORY,
  type RoleRepository,
} from '@iam/roles/domain/ports/role.repository';
import { RoleEntity } from '@iam/roles/domain/role.entity';

@QueryHandler(GetRolesQuery)
export class GetRolesQueryHandler implements IQueryHandler<
  GetRolesQuery,
  Result<RoleEntity[], DomainException>
> {
  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: RoleRepository,
  ) {}

  async execute(): Promise<Result<RoleEntity[], DomainException>> {
    const roles = await this.roleRepository.findAll();
    return Result.ok(roles);
  }
}
