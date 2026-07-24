import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@presentation/guards';
import { GetUser } from '@presentation/decorators';
import { PermissionType } from '@repo/contracts';
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
    async getMenus(@GetUser('permissions') permissions: PermissionType[]) {
        const result = await this.queryBus.execute(new GetMenusQuery({
            permissions,
        }));
        return result.unwrap();
    }
}

