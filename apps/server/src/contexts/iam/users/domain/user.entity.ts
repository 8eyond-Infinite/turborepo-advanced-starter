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
  tokenVersion: number;
  emailVerifiedAt?: Date | null;
  avatar?: string | null;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export interface UserPrimitives {
  id: string;
  email: string;
  username: string;
  password: string;
  isActive: boolean;
  isDeleted: boolean;
  tokenVersion: number;
  emailVerifiedAt: Date | null;
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

  public static register(props: {
    id: string;
    email: string;
    username: string;
    passwordHash: string;
    avatar?: string | null;
    roles?: string[];
    createdBy?: string;
    emailVerifiedAt?: Date | null;
  }): UserEntity {
    const user = UserEntity.create({
      id: new UserId(props.id),
      email: new Email(props.email),
      username: new Username(props.username),
      password: new Password(props.passwordHash),
      avatar: props.avatar || null,
      isActive: true,
      isDeleted: false,
      tokenVersion: 0,
      emailVerifiedAt: props.emailVerifiedAt ?? null,
      roles: props.roles || ['USER'],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: props.createdBy || null,
      updatedBy: null,
    });

    user.addDomainEvent(
      new UserRegisteredEvent(user.id, user.email, user.username),
    );
    return user;
  }

  public get id(): string {
    return this.props.id.value;
  }
  public get email(): string {
    return this.props.email.value;
  }
  public get username(): string {
    return this.props.username.value;
  }
  public get password(): string {
    return this.props.password.value;
  }
  public get avatar(): string | null | undefined {
    return this.props.avatar;
  }
  public get isActive(): boolean {
    return this.props.isActive;
  }
  public get isDeleted(): boolean {
    return this.props.isDeleted;
  }
  public get tokenVersion(): number {
    return this.props.tokenVersion;
  }
  public get emailVerifiedAt(): Date | null {
    return this.props.emailVerifiedAt ?? null;
  }
  public get roles(): string[] {
    return this.props.roles;
  }
  public get createdAt(): Date {
    return this.props.createdAt;
  }
  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
  public get createdBy(): string | null | undefined {
    return this.props.createdBy;
  }
  public get updatedBy(): string | null | undefined {
    return this.props.updatedBy;
  }

  public updateRoles(roles: string[], updatedBy?: string): void {
    const nextRoles = [...new Set(roles)];
    const rolesChanged =
      nextRoles.length !== this.props.roles.length ||
      nextRoles.some((role) => !this.props.roles.includes(role));

    if (!rolesChanged) return;

    this.props.roles = nextRoles;
    this.revokeAccessTokens();
    this.trackUpdate(updatedBy);
  }

  public updateInfo(
    email: string,
    username: string,
    avatar?: string | null,
    updatedBy?: string,
  ): void {
    const emailChanged = this.props.email.value !== new Email(email).value;
    this.props.email = new Email(email);
    this.props.username = new Username(username);
    this.props.avatar = avatar ?? null;
    if (emailChanged) this.props.emailVerifiedAt = null;
    this.trackUpdate(updatedBy);
  }

  public deactivate(updatedBy?: string): void {
    this.props.isActive = false;
    this.revokeAccessTokens();
    this.trackUpdate(updatedBy);
    this.addDomainEvent(new UserDeactivatedEvent(this.id, this.email));
  }

  public activate(updatedBy?: string): void {
    this.props.isActive = true;
    this.revokeAccessTokens();
    this.trackUpdate(updatedBy);
  }

  public softDelete(updatedBy?: string): void {
    this.props.isDeleted = true;
    this.revokeAccessTokens();
    this.trackUpdate(updatedBy);
  }

  public restore(updatedBy?: string): void {
    this.props.isDeleted = false;
    this.revokeAccessTokens();
    this.trackUpdate(updatedBy);
  }

  // Global logout: invalidates every already-issued access token immediately,
  // in addition to the refresh sessions revoked in the session store.
  public logoutEverywhere(): void {
    this.revokeAccessTokens();
    this.trackUpdate();
  }

  private trackUpdate(updatedBy?: string): void {
    if (updatedBy) this.props.updatedBy = updatedBy;
    this.props.updatedAt = new Date();
  }

  private revokeAccessTokens(): void {
    this.props.tokenVersion += 1;
  }

  public toPrimitives(): UserPrimitives {
    return {
      id: this.props.id.value,
      email: this.props.email.value,
      username: this.props.username.value,
      password: this.props.password.value,
      avatar: this.props.avatar,
      isActive: this.props.isActive,
      isDeleted: this.props.isDeleted,
      tokenVersion: this.props.tokenVersion,
      emailVerifiedAt: this.props.emailVerifiedAt ?? null,
      roles: this.props.roles,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
      createdBy: this.props.createdBy,
      updatedBy: this.props.updatedBy,
    };
  }
}
