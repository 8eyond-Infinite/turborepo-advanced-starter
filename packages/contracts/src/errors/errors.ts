export const Errors = {
    // Auth
    INVALID_CREDENTIALS: {
        code: 'INVALID_CREDENTIALS',
        translationKey: 'exceptions.invalid.credentials',
        statusCode: 401,
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

export type ErrorDefinition = typeof Errors[keyof typeof Errors];
export type ErrorCode = ErrorDefinition['code'];
export type TranslationKey = ErrorDefinition['translationKey'];
