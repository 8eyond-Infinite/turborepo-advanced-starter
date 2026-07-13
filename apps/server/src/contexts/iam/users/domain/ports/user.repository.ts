import { UserEntity } from '../user.entity';

export interface UserRepository {
    save(user: UserEntity): Promise<void>;
    findById(id: string): Promise<UserEntity | null>;
    findByEmail(email: string): Promise<UserEntity | null>;
    getPermissions(userId: string): Promise<string[]>;
    findAll(): Promise<UserEntity[]>;
    nextIdentity(): string;
    exists(id: string): Promise<boolean>;
    delete(id: string): Promise<void>;
}