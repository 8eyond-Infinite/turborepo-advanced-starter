import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { RoleRepository } from '../../domain/ports/role.repository';
import { RoleEntity } from '../../domain/role.entity';
import * as crypto from 'crypto';

@Injectable()
export class PrismaRoleRepository implements RoleRepository {
    constructor(private readonly prisma: PrismaService) { }

    async save(role: RoleEntity): Promise<void> {
        const data = role.toPrimitives();

        await this.prisma.$transaction(async (tx) => {
            const exists = await tx.role.count({ where: { id: data.id } });

            if (exists > 0) {
                await tx.role.update({
                    where: { id: data.id },
                    data: {
                        name: data.name,
                        description: data.description,
                        isDeleted: data.isDeleted,
                        updatedBy: data.updatedBy,
                    },
                });
            } else {
                await tx.role.create({
                    data: {
                        id: data.id,
                        name: data.name,
                        description: data.description,
                        isDeleted: data.isDeleted,
                        createdBy: data.createdBy,
                    },
                });
            }

            const dbPermissions = await tx.permission.findMany({
                where: {
                    name: { in: data.permissions }
                }
            });

            const targetPermissionIds = dbPermissions.map(p => p.id);

            await tx.rolePermission.deleteMany({
                where: { roleId: data.id }
            });

            if (targetPermissionIds.length > 0) {
                await tx.rolePermission.createMany({
                    data: targetPermissionIds.map(permId => ({
                        roleId: data.id,
                        permissionId: permId
                    }))
                });
            }
        });
    }

    async findById(id: string): Promise<RoleEntity | null> {
        const raw = await this.prisma.role.findFirst({
            where: { id, isDeleted: false },
            include: {
                rolePermissions: {
                    include: {
                        permission: true
                    }
                }
            }
        });

        if (!raw) return null;

        return RoleEntity.create({
            id: raw.id,
            name: raw.name,
            description: raw.description,
            isDeleted: raw.isDeleted,
            permissions: raw.rolePermissions.map(rp => rp.permission.name),
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
            createdBy: raw.createdBy,
            updatedBy: raw.updatedBy,
        });
    }

    async findByName(name: string): Promise<RoleEntity | null> {
        const raw = await this.prisma.role.findFirst({
            where: { name, isDeleted: false },
            include: {
                rolePermissions: {
                    include: {
                        permission: true
                    }
                }
            }
        });

        if (!raw) return null;

        return RoleEntity.create({
            id: raw.id,
            name: raw.name,
            description: raw.description,
            isDeleted: raw.isDeleted,
            permissions: raw.rolePermissions.map(rp => rp.permission.name),
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
            createdBy: raw.createdBy,
            updatedBy: raw.updatedBy,
        });
    }

    async findAll(): Promise<RoleEntity[]> {
        const raws = await this.prisma.role.findMany({
            where: { isDeleted: false },
            orderBy: { createdAt: 'asc' },
            include: {
                rolePermissions: {
                    include: {
                        permission: true
                    }
                }
            }
        });

        return raws.map(raw => RoleEntity.create({
            id: raw.id,
            name: raw.name,
            description: raw.description,
            isDeleted: raw.isDeleted,
            permissions: raw.rolePermissions.map(rp => rp.permission.name),
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
            createdBy: raw.createdBy,
            updatedBy: raw.updatedBy,
        }));
    }

    async delete(id: string): Promise<void> {
        await this.prisma.role.update({
            where: { id },
            data: { isDeleted: true },
        });
    }

    nextIdentity(): string {
        return crypto.randomUUID();
    }

    async exists(id: string): Promise<boolean> {
        const count = await this.prisma.role.count({
            where: { id, isDeleted: false },
        });
        return count > 0;
    }

    async findAllPermissions(): Promise<{ id: string; name: string; description: string | null; displayName: string | null; module: string | null }[]> {
        return await this.prisma.permission.findMany({
            select: {
                id: true,
                name: true,
                description: true,
                displayName: true,
                module: true,
            }
        });
    }
}
