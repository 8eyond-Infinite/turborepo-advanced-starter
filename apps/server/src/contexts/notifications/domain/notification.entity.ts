import { AggregateRoot } from '@shared/domain/aggregate-root';
import { NotificationCreatedEvent } from './events/notification-created.event';

export interface NotificationProps {
    id: string;
    userId: string;
    title: string;
    content: string;
    type: string;
    isRead: boolean;
    createdAt: Date;
}

export class NotificationEntity extends AggregateRoot {
    private constructor(private readonly props: NotificationProps) {
        super();
    }

    public static create(props: NotificationProps): NotificationEntity {
        return new NotificationEntity(props);
    }

    public static createNew(props: {
        id: string;
        userId: string;
        title: string;
        content: string;
        type?: string;
    }): NotificationEntity {
        const entity = new NotificationEntity({
            id: props.id,
            userId: props.userId,
            title: props.title,
            content: props.content,
            type: props.type || 'INFO',
            isRead: false,
            createdAt: new Date(),
        });

        entity.addDomainEvent(
            new NotificationCreatedEvent(
                entity.id,
                entity.userId,
                entity.title,
                entity.content,
                entity.type,
                entity.isRead,
                entity.createdAt
            )
        );

        return entity;
    }

    public markAsRead(): void {
        this.props.isRead = true;
    }

    public get id(): string { return this.props.id; }
    public get userId(): string { return this.props.userId; }
    public get title(): string { return this.props.title; }
    public get content(): string { return this.props.content; }
    public get type(): string { return this.props.type; }
    public get isRead(): boolean { return this.props.isRead; }
    public get createdAt(): Date { return this.props.createdAt; }
}
