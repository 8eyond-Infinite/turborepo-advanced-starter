import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Can } from "./usePermission";
import { useAuthStore } from "@/features/auth";
import type { User } from "@repo/types";

const loginAs = (permissions: string[]) => {
  useAuthStore.setState({
    user: {
      id: "u1",
      email: "tester@example.com",
      username: "tester",
      isActive: true,
      isDeleted: false,
      roles: ["TESTER"],
      permissions,
      createdAt: new Date().toISOString(),
    } as User,
    isAuthenticated: true,
    isLoading: false,
  });
};

describe("<Can /> application permission gating", () => {
  it("renders children when the user holds the required permission", () => {
    loginAs(["user:read"]);
    render(<Can I="user:read">visible-content</Can>);
    expect(screen.getByText("visible-content")).toBeInTheDocument();
  });

  it("renders the fallback when the permission is missing", () => {
    loginAs(["user:read"]);
    render(
      <Can I="user:delete" fallback={<span>denied</span>}>
        secret
      </Can>,
    );
    expect(screen.getByText("denied")).toBeInTheDocument();
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("requires every permission listed in `all`", () => {
    loginAs(["user:read", "user:update"]);
    render(
      <Can all={["user:read", "user:delete"]} fallback={<span>denied</span>}>
        secret
      </Can>,
    );
    expect(screen.getByText("denied")).toBeInTheDocument();
  });

  it("accepts any one match for `any`", () => {
    loginAs(["user:update"]);
    render(<Can any={["user:delete", "user:update"]}>allowed</Can>);
    expect(screen.getByText("allowed")).toBeInTheDocument();
  });

  it("renders children when no requirement is declared (documented fail-open)", () => {
    loginAs([]);
    render(<Can>public-for-authenticated</Can>);
    expect(screen.getByText("public-for-authenticated")).toBeInTheDocument();
  });

  it("hides content entirely when there is no authenticated user", () => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
    render(
      <Can I="user:read" fallback={<span>denied</span>}>
        secret
      </Can>,
    );
    expect(screen.getByText("denied")).toBeInTheDocument();
  });
});
