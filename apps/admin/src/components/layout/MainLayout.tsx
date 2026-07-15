import { Outlet, useLocation, Link } from 'react-router-dom'
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { TooltipProvider } from '@/components/ui/tooltip'
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export const MainLayout = () => {
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Tổng quan' },
    { path: '/users', label: 'Quản lý Users' },
    { path: '/roles', label: 'Phân quyền Roles' },
  ]

  const currentLabel = navItems.find((item) => item.path === location.pathname)?.label || 'Dashboard'

  return (
    <SidebarProvider>
      <TooltipProvider>
        <AppSidebar />
        <SidebarInset className="bg-zinc-950 text-zinc-100 flex flex-col min-h-screen">
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-zinc-800 bg-zinc-900/60 backdrop-blur px-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1 text-zinc-400 hover:text-zinc-200 cursor-pointer" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4 bg-zinc-800"
              />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink asChild className="text-zinc-500 hover:text-zinc-300">
                      <Link to="/">Admin Panel</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block text-zinc-600" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-zinc-200 font-semibold">{currentLabel}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          {/* Subpage Container */}
          <main className="flex-1 p-8 overflow-y-auto">
            <Outlet />
          </main>
        </SidebarInset>
      </TooltipProvider>
    </SidebarProvider>
  )
}
