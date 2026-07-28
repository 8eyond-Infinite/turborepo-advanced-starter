import type { User } from "@repo/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/features/auth";
import { ApiClient } from "@/lib/api-client";
import { AppSidebar } from "./app-sidebar";

function renderSidebar() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SidebarProvider>
            <AppSidebar />
          </SidebarProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("<AppSidebar />", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      user: {
        id: "admin-1",
        email: "admin@example.com",
        permissions: ["user:read"],
      } as User,
      isAuthenticated: true,
      isLoading: false,
    });
  });

  it("shows a loading status while navigation is being fetched", () => {
    vi.spyOn(ApiClient, "get").mockReturnValue(new Promise(() => undefined));

    renderSidebar();

    expect(screen.getByRole("status")).toHaveTextContent("Đang tải menu…");
  });

  it("renders only known routes allowed by the current principal", async () => {
    vi.spyOn(ApiClient, "get").mockResolvedValue([
      {
        title: "Administration",
        url: "#",
        icon: "Shield",
        items: [
          { title: "Users", url: "/users", permission: "user:read" },
          { title: "Roles", url: "/roles", permission: "role:read" },
          { title: "Unknown", url: "/unknown", permission: "user:read" },
        ],
      },
    ]);

    renderSidebar();

    await userEvent.click(
      await screen.findByRole("button", { name: "Administration" }),
    );
    expect(await screen.findByText("Users")).toBeInTheDocument();
    expect(screen.queryByText("Roles")).not.toBeInTheDocument();
    expect(screen.queryByText("Unknown")).not.toBeInTheDocument();
  });

  it("explains menu failures and lets the user retry", async () => {
    vi.spyOn(ApiClient, "get")
      .mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValueOnce([
        {
          title: "Administration",
          url: "#",
          items: [{ title: "Users", url: "/users", permission: "user:read" }],
        },
      ]);

    renderSidebar();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không thể tải menu quản trị.",
    );

    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));

    await userEvent.click(
      await screen.findByRole("button", { name: "Administration" }),
    );
    await waitFor(() => {
      expect(screen.getByText("Users")).toBeInTheDocument();
    });
    expect(ApiClient.get).toHaveBeenCalledTimes(2);
  });
});
