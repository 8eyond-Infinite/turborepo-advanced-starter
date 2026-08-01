import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  UserRepository,
  FindAllOptions,
} from '../../domain/ports/user.repository';
import { UserEntity } from '../../domain/user.entity';
import { PrismaUserMapper } from '../mappers/prisma-user.mapper';
import * as crypto from 'crypto';
import { serializeDomainEvent } from '@infrastructure/event-bus/outbox/outbox-event.mapper';
import type { Prisma } from '@repo/database';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(user: UserEntity): Promise<void> {
    await this.prisma.$transaction((tx) => this.persist(tx, user));
    user.clearDomainEvents();
  }

  async savePreservingLastAdministrator(user: UserEntity): Promise<boolean> {
    const data = user.toPrimitives();

    const saved = await this.prisma.$transaction(async (tx) => {
      // Serialize every operation that may remove an active ADMIN. A plain
      // count followed by a write is vulnerable to concurrent write skew.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(73194621)`;

      const current = await tx.user.findFirst({
        where: { id: data.id },
        select: {
          isActive: true,
          isDeleted: true,
          userRoles: {
            where: { role: { name: 'ADMIN', isDeleted: false } },
            select: { roleId: true },
          },
        },
      });
      const wasActiveAdministrator =
        Boolean(current?.isActive) &&
        !current?.isDeleted &&
        Boolean(current?.userRoles.length);
      const willBeActiveAdministrator =
        data.isActive && !data.isDeleted && data.roles.includes('ADMIN');

      if (wasActiveAdministrator && !willBeActiveAdministrator) {
        const activeAdministratorCount = await tx.user.count({
          where: {
            isActive: true,
            isDeleted: false,
            userRoles: {
              some: { role: { name: 'ADMIN', isDeleted: false } },
            },
          },
        });
        if (activeAdministratorCount <= 1) return false;
      }

      await this.persist(tx, user);
      return true;
    });

    if (saved) user.clearDomainEvents();
    return saved;
  }

  private async persist(
    tx: Prisma.TransactionClient,
    user: UserEntity,
  ): Promise<void> {
    const data = user.toPrimitives();
    const outboxEvents = user.getDomainEvents().map(serializeDomainEvent);
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
        tokenVersion: data.tokenVersion,
        emailVerifiedAt: data.emailVerifiedAt,
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
        tokenVersion: data.tokenVersion,
        createdBy: data.createdBy,
        emailVerifiedAt: data.emailVerifiedAt,
      },
    });

    // Synchronize User Roles
    await tx.userRole.deleteMany({
      where: { userId: data.id },
    });

    if (data.roles && data.roles.length > 0) {
      const dbRoles = await tx.role.findMany({
        where: { name: { in: data.roles } },
      });
      if (dbRoles.length > 0) {
        await tx.userRole.createMany({
          data: dbRoles.map((r) => ({
            userId: data.id,
            roleId: r.id,
          })),
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

    if (outboxEvents.length > 0) {
      await tx.outboxEvent.createMany({
        data: outboxEvents,
      });
    }
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

  async changePassword(userId: string, passwordHash: string): Promise<boolean> {
    const result = await this.prisma.user.updateMany({
      where: { id: userId, isActive: true, isDeleted: false },
      data: {
        password: passwordHash,
        tokenVersion: { increment: 1 },
        updatedAt: new Date(),
      },
    });
    return result.count === 1;
  }

  async markEmailVerified(
    userId: string,
    email: string,
    verifiedAt: Date,
  ): Promise<boolean> {
    const result = await this.prisma.user.updateMany({
      where: {
        id: userId,
        email,
        isActive: true,
        isDeleted: false,
        emailVerifiedAt: null,
      },
      data: { emailVerifiedAt: verifiedAt, updatedAt: verifiedAt },
    });
    return result.count === 1;
  }

  async findExistingRoleNames(names: string[]): Promise<string[]> {
    if (names.length === 0) return [];

    const roles = await this.prisma.role.findMany({
      where: { name: { in: names }, isDeleted: false },
      select: { name: true },
    });
    return roles.map((role) => role.name);
  }

  async getPermissions(userId: string): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId, role: { isDeleted: false } },
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

  async findAll(
    options?: FindAllOptions,
  ): Promise<{ users: UserEntity[]; total: number }> {
    const where: Prisma.UserWhereInput = { isDeleted: false };

    if (options?.search) {
      where.email = {
        contains: options.search,
        mode: 'insensitive',
      };
    }

    const orderBy: Prisma.UserOrderByWithRelationInput = {};
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
