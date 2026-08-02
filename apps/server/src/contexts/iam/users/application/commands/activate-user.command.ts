import { ICommand } from '@nestjs/cqrs';

export class ActivateUserCommand implements ICommand {
  public readonly id: string;
  public readonly adminId: string;

  constructor(props: { id: string; adminId: string }) {
    this.id = props.id;
    this.adminId = props.adminId;
  }
}
