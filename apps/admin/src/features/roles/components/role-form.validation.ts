export interface RoleFormValues {
  name: string;
  description: string;
}

export interface RoleFormErrors {
  name?: string;
  description?: string;
}

export const validateRoleForm = ({
  name,
  description,
}: RoleFormValues): RoleFormErrors => {
  const errors: RoleFormErrors = {};
  const normalizedName = name.trim();
  const normalizedDescription = description.trim();

  if (normalizedName.length < 2) {
    errors.name = "Tên vai trò phải có ít nhất 2 ký tự.";
  } else if (normalizedName.length > 50) {
    errors.name = "Tên vai trò không được vượt quá 50 ký tự.";
  }

  if (normalizedDescription.length > 255) {
    errors.description = "Mô tả không được vượt quá 255 ký tự.";
  }

  return errors;
};
