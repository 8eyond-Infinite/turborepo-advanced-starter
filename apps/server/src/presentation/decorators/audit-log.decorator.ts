import { applyDecorators, SetMetadata } from '@nestjs/common';
import type { AuthenticatedRequest } from '../http/authenticated-request';

export const AUDIT_LOG_ACTION_KEY = 'audit_log_action';
export const AUDIT_LOG_DETAILS_CALLBACK_KEY = 'audit_log_details_callback';

export const AuditLog = (
  action: string,
  getDetails?: (request: AuthenticatedRequest, response: unknown) => string,
) =>
  applyDecorators(
    SetMetadata(AUDIT_LOG_ACTION_KEY, action),
    SetMetadata(AUDIT_LOG_DETAILS_CALLBACK_KEY, getDetails),
  );
