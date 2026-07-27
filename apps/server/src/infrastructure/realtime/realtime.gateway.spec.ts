import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';
import { RealtimeGateway } from './realtime.gateway';

describe('RealtimeGateway authentication', () => {
  const jwtService = {
    verify: jest.fn(),
  };
  const configService = {
    getOrThrow: jest.fn().mockReturnValue('access-secret'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('authenticates browser clients with handshake.auth without a query token', () => {
    jwtService.verify.mockReturnValue({ sub: 'user-1' });
    const join = jest.fn();
    const disconnect = jest.fn();
    const client = {
      id: 'socket-1',
      data: {},
      handshake: {
        auth: { token: 'auth-payload-token' },
        headers: {},
        query: {},
      },
      join,
      disconnect,
    } as unknown as Socket;
    const gateway = new RealtimeGateway(
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );

    gateway.handleConnection(client);

    expect(jwtService.verify).toHaveBeenCalledWith('auth-payload-token', {
      secret: 'access-secret',
    });
    expect(join).toHaveBeenCalledWith('user:user-1');
    expect(disconnect).not.toHaveBeenCalled();
    expect(client.data).toEqual({ userId: 'user-1' });
  });

  it('disconnects clients that provide no supported credential', () => {
    const disconnect = jest.fn();
    const client = {
      id: 'socket-2',
      data: {},
      handshake: { auth: {}, headers: {}, query: {} },
      join: jest.fn(),
      disconnect,
    } as unknown as Socket;
    const gateway = new RealtimeGateway(
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );

    gateway.handleConnection(client);

    expect(jwtService.verify).not.toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalledWith(true);
  });
});
