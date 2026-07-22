export const USER_PERMISSION_FACADE = 'UserPermissionFacade';

export interface IUserPermissionFacade {
    getPermissions(userId: string): Promise<string[]>;
}
