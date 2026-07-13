import { User as PrismaUser } from '@repo/database';
import { UserEntity } from '../../domain/user.entity';

export class PrismaUserMapper {
    public static toDomain(raw: PrismaUser): UserEntity {
        return UserEntity.create({
            id: raw.id,
            email: raw.email,
            password: raw.password,
            isActive: raw.isActive,
            isDeleted: raw.isDeleted,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
            createdBy: raw.createdBy,
            updatedBy: raw.updatedBy,
        });
    }
}
