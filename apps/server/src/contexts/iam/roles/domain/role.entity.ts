import { AggregateRoot } from '@shared/domain/aggregate-root';

export interface RoleProps {
    id: string;
    name: string;
    description: string | null;
    isDeleted: boolean;
    permissions: string[]; // List of permission names
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string | null;
    updatedBy?: string | null;
}

export class RoleEntity extends AggregateRoot {
    private constructor(private readonly props: RoleProps) {
        super();
    }

    public static create(props: RoleProps): RoleEntity {
        return new RoleEntity(props);
    }

    public static register(props: { id: string; name: string; description?: string; permissions?: string[]; createdBy?: string }): RoleEntity {
        return new RoleEntity({
            id: props.id,
            name: props.name,
            description: props.description || null,
            isDeleted: false,
            permissions: props.permissions || [],
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: props.createdBy || null,
            updatedBy: null,
        });
    }

    public get id(): string { return this.props.id; }
    public get name(): string { return this.props.name; }
    public get description(): string | null { return this.props.description; }
    public get isDeleted(): boolean { return this.props.isDeleted; }
    public get permissions(): string[] { return this.props.permissions; }
    public get createdAt(): Date { return this.props.createdAt; }
    public get updatedAt(): Date { return this.props.updatedAt; }
    public get createdBy(): string | null | undefined { return this.props.createdBy; }
    public get updatedBy(): string | null | undefined { return this.props.updatedBy; }

    public updatePermissions(permissions: string[], updatedBy?: string): void {
        this.props.permissions = permissions;
        this.trackUpdate(updatedBy);
    }

    public updateDetails(name: string, description: string | null, updatedBy?: string): void {
        this.props.name = name;
        this.props.description = description;
        this.trackUpdate(updatedBy);
    }

    private trackUpdate(updatedBy?: string): void {
        this.props.updatedAt = new Date();
        if (updatedBy) {
            this.props.updatedBy = updatedBy;
        }
    }

    public toPrimitives() {
        return { ...this.props };
    }
}
