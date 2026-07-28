import { useState } from "react";
import { ChevronsUpDown, LogOut } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth";
import { getFriendlyErrorMessage } from "@/lib/error-handler";

type LogoutAction = "current" | "global";

function getUserInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}) {
  const { isMobile } = useSidebar();
  const logout = useAuthStore((state) => state.logout);
  const logoutGlobal = useAuthStore((state) => state.logoutGlobal);
  const navigate = useNavigate();
  const [pendingAction, setPendingAction] = useState<LogoutAction | null>(null);
  const initials = getUserInitials(user.name);

  const runLogout = async (action: LogoutAction) => {
    if (pendingAction) return;
    setPendingAction(action);

    try {
      await (action === "global" ? logoutGlobal() : logout());
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(`Không thể đăng xuất: ${getFriendlyErrorMessage(error)}`);
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              aria-label={`Mở menu tài khoản ${user.email}`}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={pendingAction !== null}
              onClick={() => void runLogout("current")}
              className="cursor-pointer"
            >
              <LogOut />
              {pendingAction === "current" ? "Đang đăng xuất…" : "Đăng xuất"}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={pendingAction !== null}
              onClick={() => void runLogout("global")}
              className="cursor-pointer text-red-400 hover:text-red-300"
            >
              <LogOut className="text-red-500" />
              {pendingAction === "global"
                ? "Đang đăng xuất mọi thiết bị…"
                : "Đăng xuất mọi thiết bị"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
