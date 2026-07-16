import { UserEntity } from '../user.entity';

export interface FindAllOptions {
    skip?: number;
    take?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface UserRepository {
    save(user: UserEntity): Promise<void>;
    findById(id: string): Promise<UserEntity | null>;
    findByEmail(email: string): Promise<UserEntity | null>;
    getPermissions(userId: string): Promise<string[]>;
    findAll(options?: FindAllOptions): Promise<{ users: UserEntity[]; total: number }>;
    nextIdentity(): string;
    exists(id: string): Promise<boolean>;
    delete(id: string): Promise<void>;
}