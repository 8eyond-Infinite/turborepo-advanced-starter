import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/infrastructure/guards';
import { GetUser } from '@shared/infrastructure/decorators';
import { UserEntity } from '../../../iam/users/domain/user.entity';
import { GetMenusQuery } from '../../application/queries/get-menus.query';

@ApiTags('Menu')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('menus')
export class MenuController {
    constructor(
        private readonly queryBus: QueryBus,
    ) { }

    @Get()
    @ApiOperation({ summary: 'Get dynamic navigation menu items tree for the current user' })
    @ApiResponse({ status: 200, description: 'Return list of dynamic menus' })
    async getMenus(@GetUser() user: UserEntity) {
        const result = await this.queryBus.execute(new GetMenusQuery({
            userId: user.id,
        }));
        return result.unwrap();
    }
}
