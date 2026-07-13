export class Result<T, E> {
    private constructor(
        public readonly isSuccess: boolean,
        public readonly isFailure: boolean,
        private readonly _value?: T,
        private readonly _error?: E
    ) {}

    public static ok<T, E>(value: T): Result<T, E> {
        return new Result<T, E>(true, false, value, undefined);
    }

    public static fail<T, E>(error: E): Result<T, E> {
        return new Result<T, E>(false, true, undefined, error);
    }

    public getValue(): T {
        if (this.isFailure) {
            throw new Error('Cannot get value of a failed result.');
        }
        return this._value!;
    }

    public getError(): E {
        if (this.isSuccess) {
            throw new Error('Cannot get error of a successful result.');
        }
        return this._error!;
    }

    public unwrap(): T {
        if (this.isFailure) {
            throw this._error;
        }
        return this._value!;
    }
}
