import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MenuController } from './presentation/controllers/menu.controller';
import { GetMenusQueryHandler } from './application/queries/handlers/get-menus.handler';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { MENU_READER } from './application/ports/menu-reader.port';
import { PrismaMenuReader } from './infrastructure/prisma-menu.reader';

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [MenuController],
  providers: [
    GetMenusQueryHandler,
    { provide: MENU_READER, useClass: PrismaMenuReader },
  ],
})
export class MenuModule {}
