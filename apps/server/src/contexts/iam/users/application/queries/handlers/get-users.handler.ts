import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetUsersQuery } from '../get-users.query';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import type { UserRepository } from '@iam/users/domain/ports/user.repository';
import { UserEntity } from '@iam/users/domain/user.entity';

@QueryHandler(GetUsersQuery)
export class GetUsersQueryHandler implements IQueryHandler<GetUsersQuery, Result<{ users: UserEntity[]; total: number }, DomainException>> {
    constructor(
        @Inject('UserRepository')
        private readonly userRepository: UserRepository,
    ) { }

    async execute(query: GetUsersQuery): Promise<Result<{ users: UserEntity[]; total: number }, DomainException>> {
        const { page, limit, search, sortBy, sortOrder } = query;
        const skip = (page - 1) * limit;
        const result = await this.userRepository.findAll({
            skip,
            take: limit,
            search,
            sortBy,
            sortOrder,
        });
        return Result.ok(result);
    }
}
