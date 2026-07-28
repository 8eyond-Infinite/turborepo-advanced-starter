import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { MainLayout } from "./MainLayout";

vi.mock("./app-sidebar", () => ({
  AppSidebar: () => <aside>Admin sidebar</aside>,
}));

vi.mock("./notification-bell", () => ({
  NotificationBell: () => <button type="button">Notifications</button>,
}));

vi.mock("@/components", () => ({
  LanguageToggle: () => <button type="button">Language</button>,
  ModeToggle: () => <button type="button">Theme</button>,
}));

describe("<MainLayout />", () => {
  it("renders the shared shell, route breadcrumb and nested page", () => {
    render(
      <MemoryRouter initialEntries={["/users"]}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/users" element={<p>Users page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Admin sidebar")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Administrator" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByText("Quản lý Users")).toBeInTheDocument();
    expect(screen.getByText("Users page")).toBeInTheDocument();
  });
});
