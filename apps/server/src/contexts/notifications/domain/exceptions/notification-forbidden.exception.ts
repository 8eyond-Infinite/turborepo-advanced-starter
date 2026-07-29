import { Errors } from '@repo/contracts';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class NotificationForbiddenException extends DomainException {
  constructor(notificationId: string) {
    super(
      `Notification "${notificationId}" does not belong to this user`,
      Errors.NOTIFICATION_FORBIDDEN,
      { notificationId },
    );
  }
}
