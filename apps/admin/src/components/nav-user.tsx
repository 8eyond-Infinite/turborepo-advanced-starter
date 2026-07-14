import { useNavigate } from "react-router-dom"
import { useAuthStore } from "@/features/auth/store/auth.store"
import { ApiClient } from "@/lib/api-client"
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { ChevronsUpDownIcon, LogOutIcon, GlobeIcon } from "lucide-react"

export function NavUser() {
  const { isMobile } = useSidebar()
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  if (!user) return null

  const handleLogout = async () => {
    try {
      await ApiClient.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      clearAuth()
      navigate('/login')
    }
  }

  const handleGlobalLogout = async () => {
    try {
      await ApiClient.post('/auth/logout/global')
    } catch (error) {
      console.error('Global logout error:', error)
    } finally {
      clearAuth()
      navigate('/login')
    }
  }

  const userInitials = user.email.substring(0, 2).toUpperCase()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="aria-expanded:bg-muted">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-zinc-300">
                  {user.email.split('@')[0]}
                </span>
                <span className="truncate text-xs text-zinc-500">{user.email}</span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4 text-zinc-500" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56 bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl p-1"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-zinc-300">
                    {user.email.split('@')[0]}
                  </span>
                  <span className="truncate text-xs text-zinc-500">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 cursor-pointer"
            >
              <LogOutIcon className="h-4 w-4 text-zinc-400" />
              <span>Đăng xuất</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleGlobalLogout}
              className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-red-400 hover:bg-red-950/30 hover:text-red-300 cursor-pointer"
            >
              <GlobeIcon className="h-4 w-4 text-red-500" />
              <span>Đăng xuất toàn cầu</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
