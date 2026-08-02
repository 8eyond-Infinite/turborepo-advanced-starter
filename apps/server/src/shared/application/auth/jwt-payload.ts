import type { Permission } from '@repo/contracts';

/** Internal token schema. Browser applications consume principals, not JWT claims. */
export interface JwtPayload {
  sub: string;
  email: string;
  permissions: Permission[];
  tokenVersion: number;
  jti: string;
}
