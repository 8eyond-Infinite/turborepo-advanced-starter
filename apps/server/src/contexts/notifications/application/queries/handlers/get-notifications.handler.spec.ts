import type { NotificationRepository } from '../../../domain/ports/notification.repository';
import { GetNotificationsQuery } from '../get-notifications.query';
import { GetNotificationsHandler } from './get-notifications.handler';

describe('GetNotificationsHandler', () => {
  it('returns the unread count for the whole mailbox', async () => {
    const repository = {
      findByUserId: jest.fn().mockResolvedValue({
        items: [],
        total: 57,
        unreadCount: 52,
      }),
    } as unknown as jest.Mocked<NotificationRepository>;
    const handler = new GetNotificationsHandler(repository);

    const result = await handler.execute(
      new GetNotificationsQuery('user-1', 1, 50),
    );

    expect(result.unwrap()).toMatchObject({
      items: [],
      total: 57,
      unreadCount: 52,
      page: 1,
      limit: 50,
    });
  });
});
