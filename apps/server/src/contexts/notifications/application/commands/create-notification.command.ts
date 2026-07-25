import { ICommand } from '@nestjs/cqrs';

export class CreateNotificationCommand implements ICommand {
  public readonly id?: string;
  public readonly userId: string;
  public readonly title: string;
  public readonly content: string;
  public readonly type?: string;

  constructor(props: {
    id?: string;
    userId: string;
    title: string;
    content: string;
    type?: string;
  }) {
    this.id = props.id;
    this.userId = props.userId;
    this.title = props.title;
    this.content = props.content;
    this.type = props.type;
  }
}
