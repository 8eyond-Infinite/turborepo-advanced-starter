import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/features/auth";
import { NavUser } from "./nav-user";

const { toast } = vi.hoisted(() => ({
  toast: { error: vi.fn() },
}));

vi.mock("sonner", () => ({ toast }));

const user = {
  name: "Admin Example",
  email: "admin@example.com",
  avatar: "",
};

function renderNavUser() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <TooltipProvider>
        <SidebarProvider>
          <Routes>
            <Route path="/" element={<NavUser user={user} />} />
            <Route path="/login" element={<p>Login page</p>} />
          </Routes>
        </SidebarProvider>
      </TooltipProvider>
    </MemoryRouter>,
  );
}

async function openUserMenu() {
  await userEvent.click(
    screen.getByRole("button", {
      name: "Mở menu tài khoản admin@example.com",
    }),
  );
}

describe("<NavUser />", () => {
  const logout = vi.fn().mockResolvedValue(undefined);
  const logoutGlobal = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ logout, logoutGlobal });
  });

  it("uses the current user initials instead of a hard-coded fallback", () => {
    renderNavUser();

    expect(screen.getByText("AE")).toBeInTheDocument();
  });

  it("cleans the current session before replacing history with login", async () => {
    renderNavUser();
    await openUserMenu();

    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Đăng xuất" }),
    );

    expect(logout).toHaveBeenCalledOnce();
    expect(logoutGlobal).not.toHaveBeenCalled();
    expect(await screen.findByText("Login page")).toBeInTheDocument();
  });

  it("supports global logout as a separate destructive action", async () => {
    renderNavUser();
    await openUserMenu();

    await userEvent.click(
      await screen.findByRole("menuitem", {
        name: "Đăng xuất mọi thiết bị",
      }),
    );

    expect(logoutGlobal).toHaveBeenCalledOnce();
    expect(logout).not.toHaveBeenCalled();
    expect(await screen.findByText("Login page")).toBeInTheDocument();
  });

  it("contains unexpected logout failures and keeps the current screen", async () => {
    logout.mockRejectedValueOnce(new Error("network unavailable"));
    renderNavUser();
    await openUserMenu();

    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Đăng xuất" }),
    );

    expect(await screen.findByText("Admin Example")).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledOnce();
    expect(screen.queryByText("Login page")).not.toBeInTheDocument();
  });
});
