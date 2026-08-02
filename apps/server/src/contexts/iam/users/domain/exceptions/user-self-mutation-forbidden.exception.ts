import { Errors } from '@repo/contracts';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

export type ForbiddenSelfMutation = 'activate' | 'deactivate' | 'delete';

export class UserSelfMutationForbiddenException extends DomainException {
  constructor(action: ForbiddenSelfMutation) {
    super(
      `An administrator cannot ${action} their own account`,
      Errors.USER_SELF_MUTATION_FORBIDDEN,
      { action },
    );
  }
}
