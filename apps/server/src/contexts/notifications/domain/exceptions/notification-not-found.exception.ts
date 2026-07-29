import { Errors } from '@repo/contracts';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class NotificationNotFoundException extends DomainException {
  constructor(notificationId: string) {
    super(
      `Notification with ID "${notificationId}" was not found`,
      Errors.NOTIFICATION_NOT_FOUND,
      { notificationId },
    );
  }
}
