import { Controller, Get, UseGuards, Inject } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../iam/auth/application/guards/jwt-auth.guard';
import { GetUser } from '../../../../shared/infrastructure/decorators/get-user.decorator';
import { UserEntity } from '../../../iam/users/domain/user.entity';
import type { UserRepository } from '../../../iam/users/domain/ports/user.repository';
import { GetMenusQuery } from '../../application/queries/get-menus.query';

@ApiTags('Menu')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('menus')
export class MenuController {
    constructor(
        private readonly queryBus: QueryBus,
        @Inject('UserRepository')
        private readonly userRepository: UserRepository,
    ) {}

    @Get()
    @ApiOperation({ summary: 'Get dynamic navigation menu items tree for the current user' })
    @ApiResponse({ status: 200, description: 'Return list of dynamic menus' })
    async getMenus(@GetUser() user: UserEntity) {
        const permissions = await this.userRepository.getPermissions(user.id);
        const result = await this.queryBus.execute(new GetMenusQuery(permissions));
        return result.unwrap();
    }
}
