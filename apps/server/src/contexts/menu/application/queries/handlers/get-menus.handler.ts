import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetMenusQuery } from '../get-menus.query';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Inject } from '@nestjs/common';
import { MENU_READER, type MenuReader } from '../../ports/menu-reader.port';

export interface MenuItem {
  title: string;
  url: string;
  icon?: string;
  items?: MenuItem[];
}

@QueryHandler(GetMenusQuery)
export class GetMenusQueryHandler implements IQueryHandler<
  GetMenusQuery,
  Result<MenuItem[], DomainException>
> {
  constructor(@Inject(MENU_READER) private readonly menuReader: MenuReader) {}

  async execute(
    query: GetMenusQuery,
  ): Promise<Result<MenuItem[], DomainException>> {
    const { permissions = [] } = query;

    const allMenus = await this.menuReader.findAllOrdered();

    const allowedMenus = allMenus.filter((menu) => {
      if (!menu.permission) return true;
      return permissions.some((permission) => permission === menu.permission);
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
      (node) => !(node.url === '#' && (!node.items || node.items.length === 0)),
    );

    return Result.ok(filteredTree);
  }
}
