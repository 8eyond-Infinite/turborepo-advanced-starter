import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvatarUpload } from "./AvatarUpload";

const { post, toast } = vi.hoisted(() => ({
  post: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/api-client", () => ({ ApiClient: { post } }));
vi.mock("sonner", () => ({ toast }));

describe("<AvatarUpload />", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects unsupported files before calling the API", () => {
    const onChange = vi.fn();
    render(<AvatarUpload onChange={onChange} username="member" />);

    const input = screen.getByLabelText(/avatar/i);
    fireEvent.change(input, {
      target: {
        files: [new File(["text"], "avatar.svg", { type: "image/svg+xml" })],
      },
    });

    expect(post).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      "Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF.",
    );
  });

  it("uploads a valid image and returns its storage URL", async () => {
    post.mockResolvedValue({ url: "/uploads/avatar.png" });
    const onChange = vi.fn();
    render(<AvatarUpload onChange={onChange} username="member" />);

    fireEvent.change(screen.getByLabelText(/avatar/i), {
      target: {
        files: [new File(["image"], "avatar.png", { type: "image/png" })],
      },
    });

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith("/uploads/avatar.png"),
    );
    expect(post).toHaveBeenCalledWith("/storage/upload", expect.any(FormData));
    expect(toast.success).toHaveBeenCalledOnce();
  });
});
