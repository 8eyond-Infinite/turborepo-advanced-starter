import { HelpCircle, Settings2, Shield, type LucideIcon } from "lucide-react";
import { adminRouteManifest, getAdminRoute } from "@/routes/route-manifest";

export interface MenuItem {
  title: string;
  url: string;
  permission?: string;
}

export interface MenuGroup {
  title: string;
  url: string;
  icon?: string;
  items?: MenuItem[];
}

export interface NavigationGroup extends Omit<MenuGroup, "icon" | "items"> {
  icon: LucideIcon;
  items: MenuItem[];
}

const iconRegistry: Readonly<Record<string, LucideIcon>> = {
  HelpCircle,
  Settings2,
  Shield,
};

const routablePaths = new Set(
  adminRouteManifest.map((route) => route.path as string),
);

export function isNavigationPathActive(
  pathname: string,
  targetPath: string,
): boolean {
  return (
    pathname === targetPath ||
    (targetPath !== "/" && pathname.startsWith(`${targetPath}/`))
  );
}

export function buildNavigation(
  groups: MenuGroup[],
  can: (permission?: string) => boolean,
): NavigationGroup[] {
  return groups.flatMap((group) => {
    const items = (group.items ?? []).flatMap((item) => {
      if (!routablePaths.has(item.url)) {
        return [];
      }

      const route = getAdminRoute(item.url);
      if (!route || !can(route.permission)) {
        return [];
      }

      // Path và tiêu đề vẫn do menu backend điều khiển, nhưng capability để
      // mở route phải đến từ manifest frontend — cùng nguồn với route guard.
      return [{ ...item, permission: route.permission }];
    });

    if (items.length === 0) {
      return [];
    }

    return [
      {
        ...group,
        icon: group.icon ? (iconRegistry[group.icon] ?? Shield) : Shield,
        items,
      },
    ];
  });
}
