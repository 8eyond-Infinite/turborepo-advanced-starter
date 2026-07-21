export interface CurrentUser {
    id: string;
    email: string;
    username: string;
    roles: string[];
    avatar?: string | null;
}
