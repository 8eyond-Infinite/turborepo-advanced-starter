import { Errors } from '@repo/contracts';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class RefreshSessionConsumedException extends DomainException {
  constructor() {
    super(
      'Refresh token has already been used, revoked, or expired',
      Errors.UNAUTHORIZED,
    );
  }
}
