import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvatarUpload } from "./AvatarUpload";

const { post, toast } = vi.hoisted(() => ({
  post: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return { ...actual, ApiClient: { ...actual.ApiClient, post } };
});
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
    post.mockResolvedValue({ url: "/public/uploads/avatars/avatar.png" });
    const onChange = vi.fn();
    render(<AvatarUpload onChange={onChange} username="member" />);

    fireEvent.change(screen.getByLabelText(/avatar/i), {
      target: {
        files: [new File(["image"], "avatar.png", { type: "image/png" })],
      },
    });

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(
        "/public/uploads/avatars/avatar.png",
      ),
    );
    expect(post).toHaveBeenCalledWith("/storage/upload", expect.any(FormData));
    expect(toast.success).toHaveBeenCalledOnce();
  });

  it("rejects files larger than the server's 5 MB limit", () => {
    const onChange = vi.fn();
    const file = new File(["image"], "large.png", { type: "image/png" });
    Object.defineProperty(file, "size", { value: 5 * 1024 * 1024 + 1 });
    render(<AvatarUpload onChange={onChange} username="member" />);

    fireEvent.change(screen.getByLabelText(/avatar/i), {
      target: { files: [file] },
    });

    expect(post).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledOnce();
  });

  it("keeps the existing value when upload fails", async () => {
    post.mockRejectedValue(new Error("network unavailable"));
    const onChange = vi.fn();
    render(
      <AvatarUpload
        value="/public/uploads/avatars/current.png"
        onChange={onChange}
        username="member"
      />,
    );

    fireEvent.change(screen.getByLabelText(/avatar/i), {
      target: {
        files: [new File(["image"], "avatar.png", { type: "image/png" })],
      },
    });

    await waitFor(() => expect(toast.error).toHaveBeenCalledOnce());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("rejects a malformed URL returned by storage", async () => {
    post.mockResolvedValue({ url: "javascript:alert(1)" });
    const onChange = vi.fn();
    render(<AvatarUpload onChange={onChange} username="member" />);

    fireEvent.change(screen.getByLabelText(/avatar/i), {
      target: {
        files: [new File(["image"], "avatar.png", { type: "image/png" })],
      },
    });

    await waitFor(() => expect(toast.error).toHaveBeenCalledOnce());
    expect(onChange).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
