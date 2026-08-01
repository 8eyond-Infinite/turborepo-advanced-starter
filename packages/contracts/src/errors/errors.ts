export const Errors = {
  // Auth
  INVALID_CREDENTIALS: {
    code: 'INVALID_CREDENTIALS',
    translationKey: 'exceptions.invalid.credentials',
    statusCode: 401,
  },
  INVALID_PASSWORD_RESET_TOKEN: {
    code: 'INVALID_PASSWORD_RESET_TOKEN',
    translationKey: 'exceptions.password.reset.token.invalid',
    statusCode: 400,
  },
  EMAIL_NOT_VERIFIED: {
    code: 'EMAIL_NOT_VERIFIED',
    translationKey: 'exceptions.email.not.verified',
    statusCode: 403,
  },
  INVALID_EMAIL_VERIFICATION_TOKEN: {
    code: 'INVALID_EMAIL_VERIFICATION_TOKEN',
    translationKey: 'exceptions.email.verification.token.invalid',
    statusCode: 400,
  },
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    translationKey: 'exceptions.unauthorized',
    statusCode: 401,
  },
  FORBIDDEN: {
    code: 'FORBIDDEN',
    translationKey: 'exceptions.forbidden',
    statusCode: 403,
  },

  // User
  USER_ALREADY_EXISTS: {
    code: 'USER_ALREADY_EXISTS',
    translationKey: 'exceptions.user.already.exists',
    statusCode: 409,
  },
  USER_NOT_FOUND: {
    code: 'USER_NOT_FOUND',
    translationKey: 'exceptions.user.not.found',
    statusCode: 404,
  },
  USER_DEACTIVATED: {
    code: 'USER_DEACTIVATED',
    translationKey: 'exceptions.user.deactivated',
    statusCode: 403,
  },
  USER_SELF_MUTATION_FORBIDDEN: {
    code: 'USER_SELF_MUTATION_FORBIDDEN',
    translationKey: 'exceptions.user.self.mutation.forbidden',
    statusCode: 409,
  },
  LAST_ADMINISTRATOR_REQUIRED: {
    code: 'LAST_ADMINISTRATOR_REQUIRED',
    translationKey: 'exceptions.user.last.administrator.required',
    statusCode: 409,
  },
  INVALID_USER_ROLES: {
    code: 'INVALID_USER_ROLES',
    translationKey: 'exceptions.user.roles.invalid',
    statusCode: 400,
  },

  // Role
  ROLE_ALREADY_EXISTS: {
    code: 'ROLE_ALREADY_EXISTS',
    translationKey: 'exceptions.role.already.exists',
    statusCode: 409,
  },
  ROLE_NOT_FOUND: {
    code: 'ROLE_NOT_FOUND',
    translationKey: 'exceptions.role.not.found',
    statusCode: 404,
  },
  SYSTEM_ROLE_DELETE_FORBIDDEN: {
    code: 'SYSTEM_ROLE_DELETE_FORBIDDEN',
    translationKey: 'exceptions.role.system.delete.forbidden',
    statusCode: 409,
  },
  INVALID_ROLE_PERMISSIONS: {
    code: 'INVALID_ROLE_PERMISSIONS',
    translationKey: 'exceptions.role.permissions.invalid',
    statusCode: 400,
  },
  ROLE_IN_USE: {
    code: 'ROLE_IN_USE',
    translationKey: 'exceptions.role.in.use',
    statusCode: 409,
  },

  // Notification
  NOTIFICATION_NOT_FOUND: {
    code: 'NOTIFICATION_NOT_FOUND',
    translationKey: 'exceptions.notification.not.found',
    statusCode: 404,
  },
  NOTIFICATION_FORBIDDEN: {
    code: 'NOTIFICATION_FORBIDDEN',
    translationKey: 'exceptions.notification.forbidden',
    statusCode: 403,
  },

  // Validation
  INVALID_EMAIL: {
    code: 'INVALID_EMAIL',
    translationKey: 'exceptions.invalid.email',
    statusCode: 400,
  },
  INVALID_USERNAME: {
    code: 'INVALID_USERNAME',
    translationKey: 'exceptions.invalid.username',
    statusCode: 400,
  },
  INVALID_PASSWORD: {
    code: 'INVALID_PASSWORD',
    translationKey: 'exceptions.invalid.password',
    statusCode: 400,
  },
  INVALID_USER_ID: {
    code: 'INVALID_USER_ID',
    translationKey: 'exceptions.invalid.user.id',
    statusCode: 400,
  },

  // Common
  INTERNAL_SERVER_ERROR: {
    code: 'INTERNAL_SERVER_ERROR',
    translationKey: 'errors.system_failure',
    statusCode: 500,
  },
} as const;

export type ErrorDefinition = (typeof Errors)[keyof typeof Errors];
export type ErrorCode = ErrorDefinition['code'];
export type TranslationKey = ErrorDefinition['translationKey'];
