import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetMenusQuery } from '../get-menus.query';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { USER_PERMISSION_FACADE, IUserPermissionFacade } from '@shared/domain/ports/user-permission-facade.port';

@QueryHandler(GetMenusQuery)
export class GetMenusQueryHandler implements IQueryHandler<GetMenusQuery, Result<any[], DomainException>> {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(USER_PERMISSION_FACADE)
        private readonly permissionFacade: IUserPermissionFacade,
    ) { }

    async execute(query: GetMenusQuery): Promise<Result<any[], DomainException>> {
        const { userId } = query;

        const permissions = await this.permissionFacade.getPermissions(userId);

        const allMenus = await this.prisma.menu.findMany({
            orderBy: [
                { order: 'asc' },
            ],
        });

        const allowedMenus = allMenus.filter((menu) => {
            if (!menu.permission) return true;
            return permissions.includes(menu.permission);
        });

        const roots = allowedMenus.filter((m) => !m.parentId);
        const menuTree = roots.map((root) => {
            const items = allowedMenus
                .filter((m) => m.parentId === root.id)
                .map((child) => ({
                    title: child.title,
                    url: child.url,
                    icon: child.icon || undefined,
                }));

            return {
                title: root.title,
                url: root.url,
                icon: root.icon || undefined,
                items: items.length > 0 ? items : undefined,
            };
        });

        const filteredTree = menuTree.filter(
            (node) => !(node.url === '#' && (!node.items || node.items.length === 0))
        );

        return Result.ok(filteredTree);
    }
}
