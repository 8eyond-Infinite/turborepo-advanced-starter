import type { ISessionStore } from '../../ports/session-store.port';
import { RevokeOtherSessionsCommand } from '../revoke-other-sessions.command';
import { RevokeOtherSessionsCommandHandler } from './revoke-other-sessions.handler';

describe('RevokeOtherSessionsCommandHandler', () => {
  it('preserves the current refresh session', async () => {
    const sessionStore = {
      revokeOtherUserSessions: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ISessionStore>;
    const handler = new RevokeOtherSessionsCommandHandler(sessionStore);

    const result = await handler.execute(
      new RevokeOtherSessionsCommand('user-1', 'current-jti'),
    );

    expect(result.isSuccess).toBe(true);
    expect(sessionStore.revokeOtherUserSessions).toHaveBeenCalledWith(
      'user-1',
      'current-jti',
    );
  });
});
