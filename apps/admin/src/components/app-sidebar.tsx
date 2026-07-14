import * as React from "react"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
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
import { LayoutDashboard, Users, Shield } from "lucide-react"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const navMainData = [
    {
      title: "Tổng quan",
      url: "/",
      icon: <LayoutDashboard className="h-4 w-4 shrink-0" />,
    },
    {
      title: "Quản lý Users",
      url: "/users",
      icon: <Users className="h-4 w-4 shrink-0" />,
    },
  ]

  return (
    <Sidebar collapsible="icon" className="border-r border-zinc-800" {...props}>
      {/* Brand Logo Header */}
      <SidebarHeader className="h-16 border-b border-zinc-800 flex flex-row items-center px-4 gap-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-transparent cursor-default active:translate-y-0">
              <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-400">
                <Shield className="size-5" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-bold tracking-wider text-zinc-200">
                  STARTER ADMIN
                </span>
                <span className="truncate text-xs text-zinc-500">v1.0.0</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation Content */}
      <SidebarContent className="px-2 py-4">
        <NavMain items={navMainData} />
      </SidebarContent>

      {/* User Footer */}
      <SidebarFooter className="p-2 border-t border-zinc-800">
        <NavUser />
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  )
}
