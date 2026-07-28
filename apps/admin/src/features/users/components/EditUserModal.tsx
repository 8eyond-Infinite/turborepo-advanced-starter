import { useState, type FormEvent } from "react";
import type { Role, User } from "@repo/types";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { validateUserForm, type UserFormErrors } from "./user-form.validation";
import { UserFormFields, type UserFormDraft } from "./UserFormFields";

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

export const EditUserModal = ({
  user,
  onClose,
  onUpdateUser,
  isUpdating,
  roles,
  isRolesLoading,
  isRolesError,
  rolesError,
  onRetryRoles,
}: EditUserModalProps) => {
  const [draft, setDraft] = useState<UserFormDraft>({
    email: user.email,
    username: user.username,
    password: "",
    avatar: user.avatar || null,
    roles: user.roles,
  });
  const [errors, setErrors] = useState<UserFormErrors>({});

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateUserForm(draft, { requirePassword: false });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      await onUpdateUser({
        id: user.id,
        email: draft.email.trim(),
        username: draft.username.trim(),
        avatar: draft.avatar,
        roles: draft.roles,
      });
      onClose();
    } catch {
      // The mutation owner displays the domain error; preserve the draft.
    }
  };

  const isSubmitDisabled =
    isUpdating || isRolesLoading || isRolesError || roles.length === 0;

  return (
    <Dialog open onOpenChange={(open) => !open && !isUpdating && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">
            Chỉnh sửa tài khoản
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Cập nhật thông tin và vai trò truy cập của người dùng.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <UserFormFields
            idPrefix="edit-user"
            values={draft}
            errors={errors}
            roles={roles}
            requirePassword={false}
            isRolesLoading={isRolesLoading}
            isRolesError={isRolesError}
            rolesError={rolesError}
            onRetryRoles={onRetryRoles}
            onChange={setDraft}
          />

          <div className="flex justify-end gap-2 border-t border-border/50 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isUpdating}
            >
              Hủy bỏ
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitDisabled}>
              {(isUpdating || isRolesLoading) && (
                <Loader2
                  className="mr-1.5 h-3.5 w-3.5 animate-spin"
                  aria-hidden="true"
                />
              )}
              {isUpdating
                ? "Đang lưu..."
                : isRolesLoading
                  ? "Đang tải vai trò..."
                  : "Lưu thay đổi"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
