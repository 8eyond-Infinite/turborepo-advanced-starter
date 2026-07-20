import * as React from "react"
import * as Icons from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { ApiClient } from "@/lib/api-client"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { useAuthStore } from "@/features/auth/store/auth.store"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user: authUser } = useAuthStore()

  const { data: menuData } = useQuery({
    queryKey: ["sidebar-menus"],
    queryFn: async () => {
      const response = await ApiClient.get<any[]>("/menus")
      return response.map((group: any) => ({
        ...group,
        icon: (Icons as any)[group.icon] || Icons.Shield,
        items: group.items,
      }))
    },
  })

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
    }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="h-16 flex flex-row items-center px-4 gap-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-transparent cursor-default active:translate-y-0">
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
        <NavMain items={menuData || []} />
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-zinc-800">
        <NavUser user={user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
