import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';
import type { AccessTokenValidator } from '@iam/auth/application/services/access-token-validator.service';
import { REALTIME_AUTH_ERROR_CODE } from '@repo/contracts';
import { RealtimeGateway } from './realtime.gateway';

describe('RealtimeGateway authentication', () => {
  const jwtService = {
    verify: jest.fn(),
  };
  const configService = {
    getOrThrow: jest.fn().mockReturnValue('access-secret'),
  };
  const accessTokenValidator = {
    validate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('authenticates browser clients with the same validator as HTTP', async () => {
    const payload = {
      sub: 'user-1',
      tokenVersion: 1,
      jti: 'session-1',
    };
    jwtService.verify.mockReturnValue(payload);
    accessTokenValidator.validate.mockResolvedValue({
      ...payload,
      id: 'user-1',
    });
    const client = createClient({ token: 'auth-payload-token' });
    const gateway = createGateway();

    await authenticate(gateway, client);
    gateway.handleConnection(client);

    expect(jwtService.verify).toHaveBeenCalledWith('auth-payload-token', {
      secret: 'access-secret',
    });
    expect(accessTokenValidator.validate).toHaveBeenCalledWith(payload);
    expect(client.join).toHaveBeenCalledWith('user:user-1');
    expect(client.data).toEqual({ userId: 'user-1' });
  });

  it('rejects clients that provide no supported credential', async () => {
    const gateway = createGateway();

    await expect(authenticate(gateway, createClient({}))).rejects.toMatchObject(
      {
        data: { code: REALTIME_AUTH_ERROR_CODE },
      },
    );
    expect(jwtService.verify).not.toHaveBeenCalled();
  });

  it('rejects a signed token when its user or session has been revoked', async () => {
    jwtService.verify.mockReturnValue({
      sub: 'user-1',
      tokenVersion: 1,
      jti: 'session-1',
    });
    accessTokenValidator.validate.mockResolvedValue(null);
    const gateway = createGateway();

    await expect(
      authenticate(gateway, createClient({ token: 'revoked-token' })),
    ).rejects.toMatchObject({
      data: { code: REALTIME_AUTH_ERROR_CODE },
    });
  });

  function createGateway(): RealtimeGateway {
    return new RealtimeGateway(
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
      accessTokenValidator as unknown as AccessTokenValidator,
    );
  }

  function createClient(auth: Record<string, unknown>): Socket {
    return {
      id: 'socket-1',
      data: {},
      handshake: { auth, headers: {}, query: {} },
      join: jest.fn(),
    } as unknown as Socket;
  }

  function authenticate(
    gateway: RealtimeGateway,
    client: Socket,
  ): Promise<void> {
    return (
      gateway as unknown as {
        authenticate(client: Socket): Promise<void>;
      }
    ).authenticate(client);
  }
});
