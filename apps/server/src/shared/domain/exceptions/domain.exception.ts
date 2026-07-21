export abstract class DomainException extends Error {
    public readonly args?: Record<string, any>;

    constructor(message: string, args?: Record<string, any>) {
        super(message);
        this.name = this.constructor.name;
        this.args = args;
        Error.captureStackTrace(this, this.constructor);
    }
}
