"use client"

import * as React from "react"
import {
  Settings2,
  Shield,
} from "lucide-react"

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

const data = {
  navMain: [
    {
      title: "Quản trị hệ thống",
      url: "#",
      icon: Shield,
      isActive: true,
      items: [
        {
          title: "Tổng quan",
          url: "/",
        },
        {
          title: "Quản lý Users",
          url: "/users",
        },
        {
          title: "Phân quyền Roles",
          url: "/roles",
        },
      ],
    },
    {
      title: "Cấu hình hạ tầng",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "Redis Cache",
          url: "#",
        },
        {
          title: "Database PostgreSQL",
          url: "#",
        },
        {
          title: "System Logs",
          url: "#",
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user: authUser } = useAuthStore()

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
    <Sidebar collapsible="icon" className="border-r border-zinc-800" {...props}>
      {/* Brand Header */}
      <SidebarHeader className="h-16 border-b border-zinc-800 flex flex-row items-center px-4 gap-2">
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
        <NavMain items={data.navMain} />
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-zinc-800">
        <NavUser user={user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
