import { ICommand } from '@nestjs/cqrs';

export class RevokeOtherSessionsCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly currentJti: string,
  ) {}
}
