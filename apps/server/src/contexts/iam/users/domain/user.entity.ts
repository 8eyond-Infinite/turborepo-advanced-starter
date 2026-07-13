import { UserRegisteredEvent } from './events/user-registered.event';
import { DomainEvent } from '@shared/domain/events/domain-event';
import { AggregateRoot } from '@shared/domain/aggregate-root';
import { UserId } from './value-objects/user-id.value-object';
import { Email } from './value-objects/email.value-object';
import { Password } from './value-objects/password.value-object';

export interface UserProps {
    id: UserId;
    email: Email;
    password: Password;
    isActive: boolean;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string | null;
    updatedBy?: string | null;
}

export class UserEntity extends AggregateRoot {
    private constructor(private readonly props: UserProps) {
        super();
    }

    public static create(props: UserProps): UserEntity {
        return new UserEntity(props);
    }

    public static register(props: { id: string; email: string; passwordHash: string; createdBy?: string }): UserEntity {
        const user = UserEntity.create({
            id: new UserId(props.id),
            email: new Email(props.email),
            password: new Password(props.passwordHash),
            isActive: true,
            isDeleted: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: props.createdBy || null,
            updatedBy: null,
        });

        user.addDomainEvent(new UserRegisteredEvent(user.id, user.email));
        return user;
    }

    public get id(): string { return this.props.id.value; }
    public get email(): string { return this.props.email.value; }
    public get password(): string { return this.props.password.value; }
    public get isActive(): boolean { return this.props.isActive; }
    public get isDeleted(): boolean { return this.props.isDeleted; }
    public get createdAt(): Date { return this.props.createdAt; }
    public get updatedAt(): Date { return this.props.updatedAt; }
    public get createdBy(): string | null | undefined { return this.props.createdBy; }
    public get updatedBy(): string | null | undefined { return this.props.updatedBy; }

    public deactivate(updatedBy?: string): void {
        this.props.isActive = false;
        this.trackUpdate(updatedBy);
    }

    public activate(updatedBy?: string): void {
        this.props.isActive = true;
        this.trackUpdate(updatedBy);
    }

    public softDelete(updatedBy?: string): void {
        this.props.isDeleted = true;
        this.trackUpdate(updatedBy);
    }

    public restore(updatedBy?: string): void {
        this.props.isDeleted = false;
        this.trackUpdate(updatedBy);
    }

    private trackUpdate(updatedBy?: string): void {
        if (updatedBy) this.props.updatedBy = updatedBy;
        this.props.updatedAt = new Date();
    }

    public toPrimitives(): any {
        return {
            id: this.props.id.value,
            email: this.props.email.value,
            password: this.props.password.value,
            isActive: this.props.isActive,
            isDeleted: this.props.isDeleted,
            createdAt: this.props.createdAt,
            updatedAt: this.props.updatedAt,
            createdBy: this.props.createdBy,
            updatedBy: this.props.updatedBy,
        };
    }
}