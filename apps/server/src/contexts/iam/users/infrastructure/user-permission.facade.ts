import { Injectable, Inject } from '@nestjs/common';
import { IUserPermissionFacade } from '@shared/domain/ports/user-permission-facade.port';
import type { UserRepository } from '../domain/ports/user.repository';

@Injectable()
export class UserPermissionFacade implements IUserPermissionFacade {
    constructor(
        @Inject('UserRepository')
        private readonly userRepository: UserRepository,
    ) {}

    async getPermissions(userId: string): Promise<string[]> {
        return this.userRepository.getPermissions(userId);
    }
}
