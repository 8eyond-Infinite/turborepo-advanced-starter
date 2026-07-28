import React, { useId, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ApiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getFriendlyErrorMessage } from "@/lib/error-handler";
import { resolveAvatarUrl } from "../utils/avatar-url";

interface AvatarUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  username?: string;
}

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ACCEPTED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  value,
  onChange,
  username = "AV",
}) => {
  const inputId = useId();
  const helperTextId = `${inputId}-helper`;
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_AVATAR_TYPES.has(file.type)) {
      toast.error("Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      toast.error("Ảnh đại diện không được vượt quá 5 MB.");
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await ApiClient.post<{ url: string }>(
        "/storage/upload",
        formData,
      );
      if (!resolveAvatarUrl(res.url)) {
        throw new Error("Storage returned an invalid avatar URL");
      }
      onChange(res.url);
      toast.success("Tải ảnh đại diện lên thành công!");
    } catch (error: unknown) {
      toast.error(`Không thể tải ảnh lên: ${getFriendlyErrorMessage(error)}`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex items-center gap-4 p-3 bg-muted/20 border border-dashed border-border rounded-lg">
      <div className="relative h-12 w-12 rounded-full shrink-0">
        <Avatar className="h-full w-full rounded-full">
          <AvatarImage
            src={resolveAvatarUrl(value)}
            alt={`Ảnh đại diện của ${username}`}
          />
          <AvatarFallback className="rounded-full bg-muted text-muted-foreground font-bold">
            {username.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {uploading && (
          <div
            role="status"
            aria-label="Đang tải ảnh đại diện"
            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full"
          >
            <Loader2 className="h-4 w-4 text-white animate-spin" />
          </div>
        )}
      </div>
      <div className="space-y-1">
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-muted-foreground block"
        >
          Ảnh đại diện (Avatar)
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          aria-describedby={helperTextId}
          disabled={uploading}
          onChange={handleFileChange}
          className="text-xs text-muted-foreground file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 cursor-pointer"
        />
        <p id={helperTextId} className="text-[11px] text-muted-foreground">
          JPG, PNG, WEBP hoặc GIF, tối đa 5 MB.
        </p>
      </div>
    </div>
  );
};
