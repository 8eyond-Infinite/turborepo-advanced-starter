import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QueryErrorState, SingleSelect } from "@/components";
import { AvatarUpload } from "./AvatarUpload";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { Role, User } from "@repo/types";
import { validateUserForm, type UserFormErrors } from "./user-form.validation";

interface UpdateUserInput {
  id: string;
  email: string;
  username: string;
  avatar: string | null;
  roles: string[];
}

interface EditUserModalProps {
  user: User;
  onClose: () => void;
  onUpdateUser: (data: UpdateUserInput) => Promise<unknown>;
  isUpdating: boolean;
  roles: Role[];
  isRolesLoading: boolean;
  isRolesError: boolean;
  rolesError: unknown;
  onRetryRoles: () => void;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  user,
  onClose,
  onUpdateUser,
  isUpdating,
  roles,
  isRolesLoading,
  isRolesError,
  rolesError,
  onRetryRoles,
}) => {
  const [email, setEmail] = useState(user.email);
  const [username, setUsername] = useState(user.username);
  const [avatar, setAvatar] = useState<string | null>(user.avatar || null);
  const [role, setRole] = useState(user.roles[0] || "USER");
  const [errors, setErrors] = useState<UserFormErrors>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validateUserForm(
      { email, username, role },
      { requirePassword: false },
    );
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      await onUpdateUser({
        id: user.id,
        email: email.trim(),
        username: username.trim(),
        avatar,
        roles: [role],
      });
      onClose();
    } catch {
      // Error is handled in hook
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">
            Chỉnh sửa tài khoản
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Cập nhật email và vai trò truy cập của người dùng trên hệ thống.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <AvatarUpload
            value={avatar}
            onChange={setAvatar}
            username={username || "AV"}
          />

          <div>
            <label
              htmlFor="edit-user-username"
              className="text-xs font-semibold text-muted-foreground"
            >
              Tên người dùng (Username)
            </label>
            <Input
              id="edit-user-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 bg-transparent border-input"
              aria-invalid={Boolean(errors.username)}
              aria-describedby={
                errors.username ? "edit-user-username-error" : undefined
              }
            />
            {errors.username && (
              <p
                id="edit-user-username-error"
                className="mt-1 text-xs text-destructive"
              >
                {errors.username}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="edit-user-email"
              className="text-xs font-semibold text-muted-foreground"
            >
              Địa chỉ Email
            </label>
            <Input
              id="edit-user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 bg-transparent border-input"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={
                errors.email ? "edit-user-email-error" : undefined
              }
            />
            {errors.email && (
              <p
                id="edit-user-email-error"
                className="mt-1 text-xs text-destructive"
              >
                {errors.email}
              </p>
            )}
          </div>
          <div className="space-y-2 max-w-xs">
            <label
              htmlFor="edit-user-role"
              className="text-xs font-semibold text-muted-foreground block"
            >
              Vai trò (Role)
            </label>
            <SingleSelect
              triggerId="edit-user-role"
              accessibleLabel="Chọn vai trò cho tài khoản"
              options={roles.map((r) => ({ label: r.name, value: r.name }))}
              value={role}
              onChange={setRole}
              placeholder="Chọn vai trò"
              className="w-full bg-card"
              disabled={isRolesLoading || isRolesError}
            />
            {errors.role && (
              <p className="text-xs text-destructive">{errors.role}</p>
            )}
          </div>

          {isRolesError && (
            <QueryErrorState
              error={rolesError}
              onRetry={onRetryRoles}
              title="Không thể tải danh sách vai trò"
              className="min-h-40"
            />
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="cursor-pointer text-xs"
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={
                isUpdating ||
                isRolesLoading ||
                isRolesError ||
                roles.length === 0
              }
              className="cursor-pointer text-xs"
            >
              {isUpdating || isRolesLoading ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  {isUpdating ? "Đang lưu..." : "Đang tải vai trò..."}
                </>
              ) : (
                "Lưu thay đổi"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
