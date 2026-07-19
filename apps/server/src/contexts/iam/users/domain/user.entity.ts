import { UserRegisteredEvent } from './events/user-registered.event';
import { UserDeactivatedEvent } from './events/user-deactivated.event';
import { AggregateRoot } from '@shared/domain/aggregate-root';
import { UserId, Email, Username } from './value-objects';
import { Password } from './value-objects/password.value-object';

export interface UserProps {
    id: UserId;
    email: Email;
    username: Username;
    password: Password;
    isActive: boolean;
    isDeleted: boolean;
    avatar?: string | null;
    roles: string[];
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

    public static register(props: { id: string; email: string; username: string; passwordHash: string; avatar?: string | null; roles?: string[]; createdBy?: string }): UserEntity {
        const user = UserEntity.create({
            id: new UserId(props.id),
            email: new Email(props.email),
            username: new Username(props.username),
            password: new Password(props.passwordHash),
            avatar: props.avatar || null,
            isActive: true,
            isDeleted: false,
            roles: props.roles || ['USER'],
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: props.createdBy || null,
            updatedBy: null,
        });

        user.addDomainEvent(new UserRegisteredEvent(user.id, user.email, user.username));
        return user;
    }

    public get id(): string { return this.props.id.value; }
    public get email(): string { return this.props.email.value; }
    public get username(): string { return this.props.username.value; }
    public get password(): string { return this.props.password.value; }
    public get avatar(): string | null | undefined { return this.props.avatar; }
    public get isActive(): boolean { return this.props.isActive; }
    public get isDeleted(): boolean { return this.props.isDeleted; }
    public get roles(): string[] { return this.props.roles; }
    public get createdAt(): Date { return this.props.createdAt; }
    public get updatedAt(): Date { return this.props.updatedAt; }
    public get createdBy(): string | null | undefined { return this.props.createdBy; }
    public get updatedBy(): string | null | undefined { return this.props.updatedBy; }

    public updateRoles(roles: string[], updatedBy?: string): void {
        this.props.roles = roles;
        this.trackUpdate(updatedBy);
    }

    public updateInfo(email: string, username: string, avatar?: string | null, updatedBy?: string): void {
        this.props.email = new Email(email);
        this.props.username = new Username(username);
        this.props.avatar = avatar ?? null;
        this.trackUpdate(updatedBy);
    }

    public deactivate(updatedBy?: string): void {
        this.props.isActive = false;
        this.trackUpdate(updatedBy);
        this.addDomainEvent(new UserDeactivatedEvent(this.id, this.email));
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
            username: this.props.username.value,
            password: this.props.password.value,
            avatar: this.props.avatar,
            isActive: this.props.isActive,
            isDeleted: this.props.isDeleted,
            roles: this.props.roles,
            createdAt: this.props.createdAt,
            updatedAt: this.props.updatedAt,
            createdBy: this.props.createdBy,
            updatedBy: this.props.updatedBy,
        };
    }
}