import { UserEntity } from '../user.entity';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export type UserSortField = 'email' | 'username' | 'createdAt' | 'updatedAt';

export interface FindAllOptions {
  skip?: number;
  take?: number;
  search?: string;
  sortBy?: UserSortField;
  sortOrder?: 'asc' | 'desc';
}

export interface UserRepository {
  save(user: UserEntity): Promise<void>;
  savePreservingLastAdministrator(user: UserEntity): Promise<boolean>;
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  changePassword(userId: string, passwordHash: string): Promise<boolean>;
  markEmailVerified(
    userId: string,
    email: string,
    verifiedAt: Date,
  ): Promise<boolean>;
  findExistingRoleNames(names: string[]): Promise<string[]>;
  getPermissions(userId: string): Promise<string[]>;
  findAll(
    options?: FindAllOptions,
  ): Promise<{ users: UserEntity[]; total: number }>;
  nextIdentity(): string;
  exists(id: string): Promise<boolean>;
  delete(id: string): Promise<void>;
}
