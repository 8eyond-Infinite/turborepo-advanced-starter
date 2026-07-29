import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LoginForm } from "./LoginForm";
import { useAuthStore } from "../store/auth.store";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

// Cô lập test khỏi i18n: trả thẳng message của Error.
vi.mock("@/lib/error-handler", () => ({
  getFriendlyErrorMessage: (err: unknown) =>
    err instanceof Error ? err.message : "unknown error",
}));

const renderForm = (state?: unknown) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: "/login", state }]}>
      <LoginForm />
    </MemoryRouter>,
  );

const fillAndSubmit = async (email: string, password: string) => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Mật khẩu"), password);
  await user.click(screen.getByRole("button", { name: "Đăng nhập" }));
};

describe("<LoginForm />", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("submits credentials and navigates home on success", async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    useAuthStore.setState({ login });

    renderForm();
    await fillAndSubmit("admin@example.com", "supersecret");

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        email: "admin@example.com",
        password: "supersecret",
      });
    });
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("returns to the requested internal page after login", async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    useAuthStore.setState({ login });

    renderForm({
      from: { pathname: "/users", search: "?page=2", hash: "" },
    });
    await fillAndSubmit("admin@example.com", "supersecret");

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/users?page=2", {
        replace: true,
      });
    });
  });

  it("shows a friendly error and stays on the page when login fails", async () => {
    const login = vi
      .fn()
      .mockRejectedValue(new Error("Sai thông tin đăng nhập"));
    useAuthStore.setState({ login });

    renderForm();
    await fillAndSubmit("admin@example.com", "wrong-password");

    expect(
      await screen.findByText("Sai thông tin đăng nhập"),
    ).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("toggles password visibility with an accessible control", async () => {
    const user = userEvent.setup();
    renderForm();

    const passwordInput = screen.getByLabelText("Mật khẩu");
    expect(passwordInput).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Hiện mật khẩu" }));
    expect(passwordInput).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: "Ẩn mật khẩu" }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });
});
