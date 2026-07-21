import { ErrorDefinition } from '@repo/contracts';

export abstract class DomainException extends Error {
    constructor(
        message: string,
        public readonly error: ErrorDefinition,
        public readonly args?: Record<string, any>,
    ) {
        super(message);
        this.name = new.target.name;
        Error.captureStackTrace?.(this, new.target);
    }
}
