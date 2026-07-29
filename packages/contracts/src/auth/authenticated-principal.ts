import type { Permission } from './permissions.js';

export interface AuthenticatedPrincipal {
  id: string;
  sub: string;
  email: string;
  permissions: Permission[];
  tokenVersion: number;
  jti?: string;
  sessionId?: string;
}
