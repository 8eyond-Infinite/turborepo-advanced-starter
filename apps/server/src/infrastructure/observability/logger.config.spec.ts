import { createPinoHttpOptions } from './logger.config';

describe('logger configuration', () => {
  it('redacts credentials and direct user identifiers', () => {
    const options = createPinoHttpOptions({ NODE_ENV: 'production' });

    expect(options.redact.paths).toEqual(
      expect.arrayContaining([
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        '*.accessToken',
        '*.refreshToken',
        '*.email',
      ]),
    );
    expect(options.redact.censor).toBe('[Redacted]');
    expect(options.transport).toBeUndefined();
  });
});
