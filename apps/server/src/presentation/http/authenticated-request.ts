import type { AuthenticatedPrincipal } from '@repo/contracts';
import type { Request } from 'express';

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedPrincipal;
};
