export interface UserProps {
    id: string;
    email: string;
    password: string;
    isActive: boolean;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string | null;
    updatedBy?: string | null;
}

export class UserEntity {
    private constructor(private readonly props: UserProps) { }

    public static create(props: UserProps): UserEntity {
        if (!props.email.includes('@')) {
            throw new Error('Invalid email format');
        }
        return new UserEntity(props);
    }

    public static register(props: { id: string; email: string; passwordHash: string; createdBy?: string }): UserEntity {
        return UserEntity.create({
            id: props.id,
            email: props.email,
            password: props.passwordHash,
            isActive: true,
            isDeleted: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: props.createdBy || null,
            updatedBy: null,
        });
    }

    public get id(): string { return this.props.id; }
    public get email(): string { return this.props.email; }
    public get password(): string { return this.props.password; }
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

    public toPrimitives(): UserProps {
        return { ...this.props };
    }
}