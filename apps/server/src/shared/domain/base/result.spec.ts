import { Result } from './result';

describe('Result', () => {
  it('wraps and unwraps a successful value', () => {
    const result = Result.ok<number, Error>(42);

    expect(result.isSuccess).toBe(true);
    expect(result.isFailure).toBe(false);
    expect(result.getValue()).toBe(42);
    expect(result.unwrap()).toBe(42);
    expect(() => result.getError()).toThrow(
      'Cannot get error of a successful result.',
    );
  });

  it('preserves and throws a failed error', () => {
    const error = new Error('failed');
    const result = Result.fail<number, Error>(error);

    expect(result.isSuccess).toBe(false);
    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBe(error);
    expect(() => result.getValue()).toThrow(
      'Cannot get value of a failed result.',
    );
    expect(() => result.unwrap()).toThrow(error);
  });
});
