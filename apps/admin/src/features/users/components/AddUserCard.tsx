import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QueryErrorState, SingleSelect } from "@/components";
import { AvatarUpload } from "./AvatarUpload";
import { Loader2 } from "lucide-react";

import type { Role, User } from "@repo/types";
import { validateUserForm, type UserFormErrors } from "./user-form.validation";

interface CreateUserInput {
  email: string;
  username: string;
  password: string;
  avatar: string | null;
  roles: string[];
}

interface AddUserCardProps {
  onClose: () => void;
  onCreateUser: (data: CreateUserInput) => Promise<User>;
  isCreating: boolean;
  roles: Role[];
  isRolesLoading: boolean;
  isRolesError: boolean;
  rolesError: unknown;
  onRetryRoles: () => void;
}

export const AddUserCard: React.FC<AddUserCardProps> = ({
  onClose,
  onCreateUser,
  isCreating,
  roles,
  isRolesLoading,
  isRolesError,
  rolesError,
  onRetryRoles,
}) => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [roleOverride, setRoleOverride] = useState("");
  const [errors, setErrors] = useState<UserFormErrors>({});
  const selectedRole =
    roleOverride ||
    roles.find((role) => role.name === "USER")?.name ||
    roles[0]?.name ||
    "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validateUserForm(
      { email, username, password, role: selectedRole },
      { requirePassword: true },
    );
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      await onCreateUser({
        email: email.trim(),
        username: username.trim(),
        password: password.trim(),
        avatar,
        roles: [selectedRole],
      });
      setEmail("");
      setUsername("");
      setPassword("");
      setAvatar(null);
      setRoleOverride("");
      setErrors({});
      onClose();
    } catch {
      // Error is handled in useUsers hook
    }
  };

  return (
    <Card className="border-border bg-card p-5 max-w-xl transition-all">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-sm font-bold">
          Tạo tài khoản Người dùng
        </CardTitle>
        <CardDescription className="text-xs">
          Đăng ký tài khoản người dùng trực tiếp và gán vai trò tương ứng trên
          hệ thống.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AvatarUpload
          value={avatar}
          onChange={setAvatar}
          username={username || "AV"}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="create-user-username"
              className="text-xs font-semibold text-muted-foreground"
            >
              Tên người dùng (Username)
            </label>
            <Input
              id="create-user-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="john_doe"
              className="mt-1 bg-transparent border-input"
              aria-invalid={Boolean(errors.username)}
              aria-describedby={
                errors.username ? "create-user-username-error" : undefined
              }
            />
            {errors.username && (
              <p
                id="create-user-username-error"
                className="mt-1 text-xs text-destructive"
              >
                {errors.username}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="create-user-email"
              className="text-xs font-semibold text-muted-foreground"
            >
              Địa chỉ Email
            </label>
            <Input
              id="create-user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john.doe@example.com"
              className="mt-1 bg-transparent border-input"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={
                errors.email ? "create-user-email-error" : undefined
              }
            />
            {errors.email && (
              <p
                id="create-user-email-error"
                className="mt-1 text-xs text-destructive"
              >
                {errors.email}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="create-user-password"
              className="text-xs font-semibold text-muted-foreground"
            >
              Mật khẩu khởi tạo
            </label>
            <Input
              id="create-user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 bg-transparent border-input"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password ? "create-user-password-error" : undefined
              }
            />
            {errors.password && (
              <p
                id="create-user-password-error"
                className="mt-1 text-xs text-destructive"
              >
                {errors.password}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="create-user-role"
              className="text-xs font-semibold text-muted-foreground block"
            >
              Vai trò (Role)
            </label>
            <SingleSelect
              triggerId="create-user-role"
              accessibleLabel="Chọn vai trò cho tài khoản mới"
              options={roles.map((r) => ({ label: r.name, value: r.name }))}
              value={selectedRole}
              onChange={setRoleOverride}
              placeholder="Chọn vai trò"
              className="w-full bg-card"
              disabled={isRolesLoading || isRolesError}
            />
            {errors.role && (
              <p className="text-xs text-destructive">{errors.role}</p>
            )}
          </div>
        </div>

        {isRolesError && (
          <QueryErrorState
            error={rolesError}
            onRetry={onRetryRoles}
            title="Không thể tải danh sách vai trò"
            className="min-h-40"
          />
        )}

        <div className="flex justify-end gap-2 pt-2">
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
              isCreating || isRolesLoading || isRolesError || roles.length === 0
            }
            className="cursor-pointer text-xs"
          >
            {isCreating || isRolesLoading ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                {isCreating ? "Đang tạo..." : "Đang tải vai trò..."}
              </>
            ) : (
              "Tạo người dùng"
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
};
