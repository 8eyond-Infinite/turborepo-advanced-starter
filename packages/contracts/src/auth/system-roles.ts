export const SYSTEM_ROLES = {
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;

export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

export const isSystemRole = (name: string): name is SystemRole =>
  Object.values(SYSTEM_ROLES).includes(name as SystemRole);
