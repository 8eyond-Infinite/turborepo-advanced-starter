import { SetMetadata } from '@nestjs/common';

export const AUDIT_LOG_ACTION_KEY = 'audit_log_action';
export const AUDIT_LOG_DETAILS_CALLBACK_KEY = 'audit_log_details_callback';

export const AuditLog = (action: string, getDetails?: (req: any, res: any) => string) => {
    return (target: any, key: string, descriptor: PropertyDescriptor) => {
        SetMetadata(AUDIT_LOG_ACTION_KEY, action)(target, key, descriptor);
        if (getDetails) {
            SetMetadata(AUDIT_LOG_DETAILS_CALLBACK_KEY, getDetails)(target, key, descriptor);
        }
    };
};
