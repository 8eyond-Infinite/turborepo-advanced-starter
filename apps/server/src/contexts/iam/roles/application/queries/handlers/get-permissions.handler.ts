import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetPermissionsQuery } from '../get-permissions.query';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import type { RoleRepository } from '@iam/roles/domain/ports/role.repository';

@QueryHandler(GetPermissionsQuery)
export class GetPermissionsQueryHandler implements IQueryHandler<GetPermissionsQuery, Result<{ id: string; name: string; description: string | null; displayName: string | null; module: string | null }[], DomainException>> {
    constructor(
        @Inject('RoleRepository')
        private readonly roleRepository: RoleRepository,
    ) { }

    async execute(query: GetPermissionsQuery): Promise<Result<{ id: string; name: string; description: string | null; displayName: string | null; module: string | null }[], DomainException>> {
        const permissions = await this.roleRepository.findAllPermissions();
        return Result.ok(permissions);
    }
}
