import { RoleEntity } from '../role.entity';

export interface RoleRepository {
    save(role: RoleEntity): Promise<void>;
    findById(id: string): Promise<RoleEntity | null>;
    findByName(name: string): Promise<RoleEntity | null>;
    findAll(): Promise<RoleEntity[]>;
    delete(id: string): Promise<void>;
    nextIdentity(): string;
    exists(id: string): Promise<boolean>;
    
    // For list of system permissions
    findAllPermissions(): Promise<{ id: string; name: string; description: string | null; displayName: string | null; module: string | null }[]>;
}
