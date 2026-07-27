import type { Role } from "@repo/types";
import { Input } from "@/components/ui/input";
import { QueryErrorState, SingleSelect } from "@/components";
import { AvatarUpload } from "./AvatarUpload";
import type { UserFormErrors, UserFormValues } from "./user-form.validation";

export interface UserFormDraft extends UserFormValues {
  avatar: string | null;
  password: string;
}

interface UserFormFieldsProps {
  idPrefix: "create-user" | "edit-user";
  values: UserFormDraft;
  errors: UserFormErrors;
  roles: Role[];
  requirePassword: boolean;
  isRolesLoading: boolean;
  isRolesError: boolean;
  rolesError: unknown;
  onRetryRoles: () => void;
  onChange: (nextValues: UserFormDraft) => void;
}

export const UserFormFields = ({
  idPrefix,
  values,
  errors,
  roles,
  requirePassword,
  isRolesLoading,
  isRolesError,
  rolesError,
  onRetryRoles,
  onChange,
}: UserFormFieldsProps) => {
  const update = <Key extends keyof UserFormDraft>(
    key: Key,
    value: UserFormDraft[Key],
  ) => onChange({ ...values, [key]: value });
  const fieldId = (field: keyof UserFormValues) => `${idPrefix}-${field}`;
  const errorId = (field: keyof UserFormValues) => `${idPrefix}-${field}-error`;

  return (
    <>
      <AvatarUpload
        value={values.avatar}
        onChange={(avatar) => update("avatar", avatar)}
        username={values.username || "AV"}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor={fieldId("username")}
            className="text-xs font-semibold text-muted-foreground"
          >
            Tên người dùng (Username)
          </label>
          <Input
            id={fieldId("username")}
            type="text"
            value={values.username}
            onChange={(event) => update("username", event.target.value)}
            placeholder="john_doe"
            className="mt-1 border-input bg-transparent"
            aria-invalid={Boolean(errors.username)}
            aria-describedby={errors.username ? errorId("username") : undefined}
          />
          {errors.username && (
            <p
              id={errorId("username")}
              className="mt-1 text-xs text-destructive"
            >
              {errors.username}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor={fieldId("email")}
            className="text-xs font-semibold text-muted-foreground"
          >
            Địa chỉ Email
          </label>
          <Input
            id={fieldId("email")}
            type="email"
            value={values.email}
            onChange={(event) => update("email", event.target.value)}
            placeholder="john.doe@example.com"
            className="mt-1 border-input bg-transparent"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? errorId("email") : undefined}
          />
          {errors.email && (
            <p id={errorId("email")} className="mt-1 text-xs text-destructive">
              {errors.email}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {requirePassword && (
          <div>
            <label
              htmlFor={fieldId("password")}
              className="text-xs font-semibold text-muted-foreground"
            >
              Mật khẩu khởi tạo
            </label>
            <Input
              id={fieldId("password")}
              type="password"
              value={values.password}
              onChange={(event) => update("password", event.target.value)}
              placeholder="••••••••"
              className="mt-1 border-input bg-transparent"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password ? errorId("password") : undefined
              }
            />
            {errors.password && (
              <p
                id={errorId("password")}
                className="mt-1 text-xs text-destructive"
              >
                {errors.password}
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <label
            htmlFor={fieldId("role")}
            className="block text-xs font-semibold text-muted-foreground"
          >
            Vai trò (Role)
          </label>
          <SingleSelect
            triggerId={fieldId("role")}
            accessibleLabel="Chọn vai trò cho tài khoản"
            options={roles.map((role) => ({
              label: role.name,
              value: role.name,
            }))}
            value={values.role}
            onChange={(role) => update("role", role)}
            placeholder="Chọn vai trò"
            className="w-full bg-card"
            disabled={isRolesLoading || isRolesError}
          />
          {errors.role && (
            <p id={errorId("role")} className="text-xs text-destructive">
              {errors.role}
            </p>
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
    </>
  );
};
