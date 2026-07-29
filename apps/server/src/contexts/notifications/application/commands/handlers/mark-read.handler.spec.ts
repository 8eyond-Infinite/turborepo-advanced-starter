import { MarkNotificationReadCommand } from '../mark-read.command';
import { MarkNotificationReadHandler } from './mark-read.handler';

describe('MarkNotificationReadHandler', () => {
  it('returns a typed not-found error', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
      markAllAsRead: jest.fn(),
    };
    const handler = new MarkNotificationReadHandler(repository as never);

    const result = await handler.execute(
      new MarkNotificationReadCommand({
        userId: 'user-1',
        notificationId: 'missing',
      }),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatchObject({
      error: { code: 'NOTIFICATION_NOT_FOUND', statusCode: 404 },
    });
  });

  it('returns a typed forbidden error for another user notification', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({
        userId: 'another-user',
        markAsRead: jest.fn(),
      }),
      save: jest.fn(),
      markAllAsRead: jest.fn(),
    };
    const handler = new MarkNotificationReadHandler(repository as never);

    const result = await handler.execute(
      new MarkNotificationReadCommand({
        userId: 'user-1',
        notificationId: 'notification-1',
      }),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatchObject({
      error: { code: 'NOTIFICATION_FORBIDDEN', statusCode: 403 },
    });
    expect(repository.save).not.toHaveBeenCalled();
  });
});
