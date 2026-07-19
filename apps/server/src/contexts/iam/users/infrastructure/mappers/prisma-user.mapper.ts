import { User as PrismaUser, UserRole, Role } from '@repo/database';
import { UserEntity } from '../../domain/user.entity';
import { UserId, Email, Password, Username } from '../../domain/value-objects/';

export class PrismaUserMapper {
    public static toDomain(raw: PrismaUser & { userRoles?: (UserRole & { role: Role })[] }): UserEntity {
        return UserEntity.create({
            id: new UserId(raw.id),
            email: new Email(raw.email),
            username: new Username(raw.username),
            password: new Password(raw.password),
            isActive: raw.isActive,
            isDeleted: raw.isDeleted,
            roles: raw.userRoles ? raw.userRoles.map((ur) => ur.role.name) : [],
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
            createdBy: raw.createdBy,
            updatedBy: raw.updatedBy,
        });
    }
}
