export interface JwtPayload {
    sub: string;
    email: string;
    permissions?: string[];
    jti?: string;
}
