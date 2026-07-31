import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { MetricsTokenGuard } from './metrics-token.guard';

const contextWithAuthorization = (authorization?: string) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ header: () => authorization }),
    }),
  }) as never;

describe('MetricsTokenGuard', () => {
  it('allows tokenless local development', () => {
    const guard = new MetricsTokenGuard(
      new ConfigService({ NODE_ENV: 'development' }),
    );
    expect(guard.canActivate(contextWithAuthorization())).toBe(true);
  });

  it('accepts the configured bearer token', () => {
    const guard = new MetricsTokenGuard(
      new ConfigService({ NODE_ENV: 'production', METRICS_TOKEN: 'secret' }),
    );
    expect(guard.canActivate(contextWithAuthorization('Bearer secret'))).toBe(
      true,
    );
  });

  it('rejects missing or incorrect credentials', () => {
    const guard = new MetricsTokenGuard(
      new ConfigService({ NODE_ENV: 'production', METRICS_TOKEN: 'secret' }),
    );
    expect(() => guard.canActivate(contextWithAuthorization())).toThrow(
      UnauthorizedException,
    );
    expect(() =>
      guard.canActivate(contextWithAuthorization('Bearer incorrect')),
    ).toThrow(UnauthorizedException);
  });
});
