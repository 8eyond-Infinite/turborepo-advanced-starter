import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { UserRepository } from '../../domain/ports/user.repository';
import { UserEntity } from '../../domain/user.entity';
import { UserMapper } from '../mappers/user.mapper';

@Injectable()
export class PrismaUserRepository implements UserRepository {
    constructor(private readonly prisma: PrismaService) { }

    async save(user: UserEntity): Promise<void> {
        const data = user.toPrimitives();

        await this.prisma.$transaction(async (tx) => {
            const isNewUser = !(await tx.user.findFirst({ where: { id: data.id } }));

            await tx.user.upsert({
                where: { id: data.id },
                update: {
                    email: data.email,
                    password: data.password,
                    isActive: data.isActive,
                    isDeleted: data.isDeleted,
                    updatedBy: data.updatedBy,
                },
                create: {
                    id: data.id,
                    email: data.email,
                    password: data.password,
                    isActive: data.isActive,
                    isDeleted: data.isDeleted,
                    createdBy: data.createdBy,
                },
            });

            if (isNewUser) {
                const defaultRole = await tx.role.findFirst({
                    where: { name: 'USER' },
                });
                if (defaultRole) {
                    await tx.userRole.create({
                        data: {
                            userId: data.id,
                            roleId: defaultRole.id,
                        },
                    });
                }
            }
        });
    }

    async findById(id: string): Promise<UserEntity | null> {
        const raw = await this.prisma.user.findFirst({
            where: { id, isDeleted: false }
        });
        return raw ? UserMapper.toDomain(raw) : null;
    }

    async findByEmail(email: string): Promise<UserEntity | null> {
        const raw = await this.prisma.user.findFirst({
            where: { email, isDeleted: false }
        });
        return raw ? UserMapper.toDomain(raw) : null;
    }

    async getPermissions(userId: string): Promise<string[]> {
        const userRoles = await this.prisma.userRole.findMany({
            where: { userId },
            include: {
                role: {
                    include: {
                        rolePermissions: {
                            include: {
                                permission: true,
                            },
                        },
                    },
                },
            },
        });

        const permissions = new Set<string>();
        for (const userRole of userRoles) {
            for (const rp of userRole.role.rolePermissions) {
                if (rp.permission) {
                    permissions.add(rp.permission.name);
                }
            }
        }
        return Array.from(permissions);
    }
}