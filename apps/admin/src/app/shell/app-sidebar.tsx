import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiClient } from "@/lib/api-client";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import {
  buildNavigation,
  type MenuGroup,
  type NavigationGroup,
} from "./navigation";
import { useAuthStore } from "@/features/auth";
import { usePermission } from "@/app/access/usePermission";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const authUser = useAuthStore((state) => state.user);
  const { can } = usePermission();

  const {
    data: rawMenuData,
    isPending,
    isError,
    isFetching,
    refetch,
  } = useQuery<MenuGroup[]>({
    queryKey: ["sidebar-menus"],
    queryFn: () => ApiClient.get<MenuGroup[]>("/menus"),
  });

  const navigation = React.useMemo<NavigationGroup[]>(() => {
    return buildNavigation(rawMenuData ?? [], can);
  }, [rawMenuData, can]);

  const user = authUser
    ? {
        name: authUser.email.split("@")[0],
        email: authUser.email,
        avatar: "",
      }
    : {
        name: "Guest",
        email: "",
        avatar: "",
      };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="h-16 flex flex-row items-center px-4 gap-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="hover:bg-transparent cursor-default active:translate-y-0"
            >
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-bold tracking-wider uppercase">
                  Administrator
                </span>
                <span className="truncate text-xs text-zinc-500">v1.0.0</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {isPending ? (
          <p className="px-4 py-3 text-sm text-muted-foreground" role="status">
            Đang tải menu…
          </p>
        ) : isError ? (
          <div className="space-y-2 px-4 py-3 text-sm" role="alert">
            <p className="text-muted-foreground">
              Không thể tải menu quản trị.
            </p>
            <button
              type="button"
              className="font-medium text-primary hover:underline disabled:opacity-50"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              {isFetching ? "Đang thử lại…" : "Thử lại"}
            </button>
          </div>
        ) : navigation.length > 0 ? (
          <NavMain items={navigation} />
        ) : (
          <p className="px-4 py-3 text-sm text-muted-foreground">
            Tài khoản không có menu được cấp quyền.
          </p>
        )}
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-zinc-800">
        <NavUser user={user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
