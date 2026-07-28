import { useState, type FormEvent } from "react";
import type { Role, User } from "@repo/types";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { validateUserForm, type UserFormErrors } from "./user-form.validation";
import { UserFormFields, type UserFormDraft } from "./UserFormFields";

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

const EMPTY_DRAFT: UserFormDraft = {
  email: "",
  username: "",
  password: "",
  avatar: null,
  roles: [],
};

export const AddUserCard = ({
  onClose,
  onCreateUser,
  isCreating,
  roles,
  isRolesLoading,
  isRolesError,
  rolesError,
  onRetryRoles,
}: AddUserCardProps) => {
  const [draft, setDraft] = useState<UserFormDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<UserFormErrors>({});
  const defaultRole =
    roles.find((role) => role.name === "USER")?.name || roles[0]?.name || "";
  const values = {
    ...draft,
    roles: draft.roles.length > 0 || !defaultRole ? draft.roles : [defaultRole],
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateUserForm(values, { requirePassword: true });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      await onCreateUser({
        email: values.email.trim(),
        username: values.username.trim(),
        password: values.password.trim(),
        avatar: values.avatar,
        roles: values.roles,
      });
      onClose();
    } catch {
      // The mutation owner displays the domain error; preserve the draft.
    }
  };

  const isSubmitDisabled =
    isCreating || isRolesLoading || isRolesError || roles.length === 0;

  return (
    <Card className="max-w-xl border-border bg-card p-5">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-sm font-bold">
          Tạo tài khoản Người dùng
        </CardTitle>
        <CardDescription className="text-xs">
          Đăng ký tài khoản người dùng trực tiếp và gán vai trò tương ứng.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <UserFormFields
          idPrefix="create-user"
          values={values}
          errors={errors}
          roles={roles}
          requirePassword
          isRolesLoading={isRolesLoading}
          isRolesError={isRolesError}
          rolesError={rolesError}
          onRetryRoles={onRetryRoles}
          onChange={setDraft}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isCreating}
          >
            Hủy bỏ
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitDisabled}>
            {(isCreating || isRolesLoading) && (
              <Loader2
                className="mr-1.5 h-3.5 w-3.5 animate-spin"
                aria-hidden="true"
              />
            )}
            {isCreating
              ? "Đang tạo..."
              : isRolesLoading
                ? "Đang tải vai trò..."
                : "Tạo người dùng"}
          </Button>
        </div>
      </form>
    </Card>
  );
};
