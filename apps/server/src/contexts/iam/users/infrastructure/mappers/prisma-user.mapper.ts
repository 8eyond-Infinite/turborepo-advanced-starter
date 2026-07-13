import { User as PrismaUser } from '@repo/database';
import { UserEntity } from '../../domain/user.entity';
import { UserId } from '../../domain/value-objects/user-id.value-object';
import { Email } from '../../domain/value-objects/email.value-object';
import { Password } from '../../domain/value-objects/password.value-object';

export class PrismaUserMapper {
    public static toDomain(raw: PrismaUser): UserEntity {
        return UserEntity.create({
            id: new UserId(raw.id),
            email: new Email(raw.email),
            password: new Password(raw.password),
            isActive: raw.isActive,
            isDeleted: raw.isDeleted,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
            createdBy: raw.createdBy,
            updatedBy: raw.updatedBy,
        });
    }
}
