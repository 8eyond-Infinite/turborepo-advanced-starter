import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MenuController } from './presentation/controllers/menu.controller';
import { GetMenusQueryHandler } from './application/queries/handlers/get-menus.handler';

@Module({
    imports: [
        CqrsModule,
    ],
    controllers: [
        MenuController,
    ],
    providers: [
        GetMenusQueryHandler,
    ],
})
export class MenuModule {}
