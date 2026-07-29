import { RoleEntity } from '../role.entity';

export const ROLE_REPOSITORY = Symbol('ROLE_REPOSITORY');

export interface RoleRepository {
  save(role: RoleEntity): Promise<void>;
  replacePermissionsAndRevokeAffectedUsers(role: RoleEntity): Promise<void>;
  findById(id: string): Promise<RoleEntity | null>;
  findByName(name: string): Promise<RoleEntity | null>;
  findAll(): Promise<RoleEntity[]>;
  delete(id: string): Promise<void>;
  nextIdentity(): string;
  exists(id: string): Promise<boolean>;
  findExistingPermissionNames(names: string[]): Promise<string[]>;
  countAssignedUsers(roleId: string): Promise<number>;
  findAllPermissions(): Promise<
    {
      id: string;
      name: string;
      description: string | null;
      displayName: string | null;
      module: string | null;
    }[]
  >;
}
