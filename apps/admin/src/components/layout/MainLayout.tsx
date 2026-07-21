import { Outlet, useLocation, Link } from 'react-router-dom'
import { AppSidebar, ModeToggle, LanguageToggle } from "@/components"
import { NotificationBell } from '@/components/NotificationBell'
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
    { path: '/sessions', label: 'Phiên đăng nhập' },
  ]

  const currentLabel = navItems.find((item) => item.path === location.pathname)?.label || 'Dashboard'

  return (
    <SidebarProvider>
      <TooltipProvider>
        <AppSidebar />
        <SidebarInset className="bg-background text-foreground flex flex-col min-h-screen">
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border bg-background/60 backdrop-blur px-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground cursor-pointer" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4 bg-border"
              />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink asChild className="text-muted-foreground hover:text-foreground">
                      <Link to="/">Administrator</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block text-zinc-500" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-foreground font-semibold">{currentLabel}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <LanguageToggle />
              <ModeToggle />
            </div>
          </header>
          <main className="flex-1 p-8 overflow-y-auto bg-background">
            <Outlet />
          </main>
        </SidebarInset>
      </TooltipProvider>
    </SidebarProvider>
  )
}
