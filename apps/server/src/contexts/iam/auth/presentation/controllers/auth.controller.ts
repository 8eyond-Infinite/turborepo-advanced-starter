import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { RegisterDto, LoginDto } from '../../application/dtos';
import { RegisterCommand } from '../../application/commands/register.command';
import { LoginQuery } from '../../application/queries/login.query';
import { RefreshQuery } from '../../application/queries/refresh.query';
import { JwtRefreshAuthGuard } from '../../application/guards/jwt-refresh-auth.guard';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) { }

    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    async register(@Body() dto: RegisterDto) {
        await this.commandBus.execute(new RegisterCommand(dto.email, dto.password));
        return { message: 'User registered successfully' };
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() dto: LoginDto) {
        return await this.queryBus.execute(new LoginQuery(dto.email, dto.password));
    }

    @UseGuards(JwtRefreshAuthGuard)
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(@Req() req: any) {
        const { user } = req;
        return await this.queryBus.execute(new RefreshQuery(user.user.id, user.user.email));
    }
}