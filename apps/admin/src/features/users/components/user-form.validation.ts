export interface UserFormValues {
  email: string;
  username: string;
  password?: string;
  roles: string[];
}

export type UserFormErrors = Partial<Record<keyof UserFormValues, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateUserForm = (
  values: UserFormValues,
  options: { requirePassword: boolean },
): UserFormErrors => {
  const errors: UserFormErrors = {};
  const email = values.email.trim();
  const username = values.username.trim();
  const password = values.password?.trim() ?? "";

  if (!email) {
    errors.email = "Email là bắt buộc.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Email không đúng định dạng.";
  }

  if (!username) {
    errors.username = "Username là bắt buộc.";
  } else if (username.length < 3 || username.length > 50) {
    errors.username = "Username phải có từ 3 đến 50 ký tự.";
  }

  if (options.requirePassword) {
    if (!password) {
      errors.password = "Mật khẩu là bắt buộc.";
    } else if (password.length < 6) {
      errors.password = "Mật khẩu phải có ít nhất 6 ký tự.";
    }
  }

  if (values.roles.length === 0) {
    errors.roles = "Vui lòng chọn ít nhất một vai trò.";
  }

  return errors;
};
