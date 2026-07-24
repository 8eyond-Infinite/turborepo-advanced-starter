import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { UserRepository, FindAllOptions } from '../../domain/ports/user.repository';
import { UserEntity } from '../../domain/user.entity';
import { PrismaUserMapper } from '../mappers/prisma-user.mapper';
import { DomainEventDispatcher } from '@infrastructure/event-bus/domain-event-dispatcher';
import * as crypto from 'crypto';

@Injectable()
export class PrismaUserRepository implements UserRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly domainEventDispatcher: DomainEventDispatcher,
    ) { }

    async save(user: UserEntity): Promise<void> {
        const data = user.toPrimitives();

        await this.prisma.$transaction(async (tx) => {
            const isNewUser = !(await tx.user.findFirst({ where: { id: data.id } }));

            await tx.user.upsert({
                where: { id: data.id },
                update: {
                    email: data.email,
                    username: data.username,
                    password: data.password,
                    avatar: data.avatar,
                    isActive: data.isActive,
                    isDeleted: data.isDeleted,
                    updatedBy: data.updatedBy,
                },
                create: {
                    id: data.id,
                    email: data.email,
                    username: data.username,
                    password: data.password,
                    avatar: data.avatar,
                    isActive: data.isActive,
                    isDeleted: data.isDeleted,
                    createdBy: data.createdBy,
                },
            });

            // Synchronize User Roles
            await tx.userRole.deleteMany({
                where: { userId: data.id }
            });

            if (data.roles && data.roles.length > 0) {
                const dbRoles = await tx.role.findMany({
                    where: { name: { in: data.roles } }
                });
                if (dbRoles.length > 0) {
                    await tx.userRole.createMany({
                        data: dbRoles.map((r) => ({
                            userId: data.id,
                            roleId: r.id
                        }))
                    });
                }
            } else if (isNewUser) {
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

        // Auto-dispatch domain events on save
        await this.domainEventDispatcher.dispatch(user);
    }

    async findById(id: string): Promise<UserEntity | null> {
        const raw = await this.prisma.user.findFirst({
            where: { id, isDeleted: false },
            include: {
                userRoles: {
                    include: {
                        role: true,
                    },
                },
            },
        });
        return raw ? PrismaUserMapper.toDomain(raw) : null;
    }

    async findByEmail(email: string): Promise<UserEntity | null> {
        const raw = await this.prisma.user.findFirst({
            where: { email, isDeleted: false },
            include: {
                userRoles: {
                    include: {
                        role: true,
                    },
                },
            },
        });
        return raw ? PrismaUserMapper.toDomain(raw) : null;
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

    async findAll(options?: FindAllOptions): Promise<{ users: UserEntity[]; total: number }> {
        const where: any = { isDeleted: false };

        if (options?.search) {
            where.email = {
                contains: options.search,
                mode: 'insensitive',
            };
        }

        const orderBy: any = {};
        if (options?.sortBy) {
            orderBy[options.sortBy] = options.sortOrder || 'desc';
        } else {
            orderBy.createdAt = 'desc';
        }

        const [raws, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                include: {
                    userRoles: {
                        include: {
                            role: true,
                        },
                    },
                },
                skip: options?.skip,
                take: options?.take,
                orderBy,
            }),
            this.prisma.user.count({ where }),
        ]);

        return {
            users: raws.map((raw) => PrismaUserMapper.toDomain(raw)),
            total,
        };
    }

    nextIdentity(): string {
        return crypto.randomUUID();
    }

    async exists(id: string): Promise<boolean> {
        const count = await this.prisma.user.count({
            where: { id, isDeleted: false },
        });
        return count > 0;
    }

    async delete(id: string): Promise<void> {
        await this.prisma.user.update({
            where: { id },
            data: { isDeleted: true },
        });
    }
}