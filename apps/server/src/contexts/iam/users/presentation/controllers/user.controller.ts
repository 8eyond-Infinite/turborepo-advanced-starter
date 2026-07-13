import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../../../auth/application/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../auth/application/guards/permissions.guard';
import { RequirePermissions } from '../../../auth/application/decorators/permissions.decorator';
import { GetUser } from '@shared/infrastructure/decorators/get-user.decorator';
import { GetUsersQuery } from '../../application/queries/get-users.query';
import { GetUserByIdQuery } from '../../application/queries/get-user-by-id.query';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
    constructor(private readonly queryBus: QueryBus) { }

    @Get('me')
    async getMe(@GetUser('id') userId: string) {
        const user = await this.queryBus.execute(new GetUserByIdQuery(userId));
        if (!user) return null;
        const { password, ...safeUser } = user.toPrimitives();
        return safeUser;
    }

    @Get()
    @UseGuards(PermissionsGuard)
    @RequirePermissions('user:read')
    async getUsers() {
        const users = await this.queryBus.execute(new GetUsersQuery());
        return users.map((user: any) => {
            const { password, ...safeUser } = user.toPrimitives();
            return safeUser;
        });
    }
}
