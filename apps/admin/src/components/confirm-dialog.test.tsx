import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./confirm-dialog";

describe("<ConfirmDialog />", () => {
  it("stays open while an asynchronous confirmation is pending", async () => {
    let resolveConfirmation!: () => void;
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveConfirmation = resolve;
        }),
    );
    const user = userEvent.setup();

    render(
      <ConfirmDialog
        trigger={<button type="button">Open</button>}
        title="Delete user"
        confirmText="Delete"
        pendingText="Deleting..."
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Deleting..." })).toBeDisabled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    resolveConfirmation();

    expect(
      await screen.findByRole("button", { name: "Open" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("keeps the dialog open when confirmation fails", async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        trigger={<button type="button">Open</button>}
        title="Delete user"
        confirmText="Delete"
        onConfirm={() => Promise.reject(new Error("failed"))}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
  });
});
