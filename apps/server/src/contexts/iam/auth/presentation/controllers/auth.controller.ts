import {
    Controller,
    Post,
    Get,
    Delete,
    Body,
    Param,
    Query,
    HttpCode,
    HttpStatus,
    UseGuards,
    Req
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RegisterDto, LoginDto } from '../dtos';
import { RegisterCommand } from '../../application/commands/register.command';
import { LogoutCommand } from '../../application/commands/logout.command';
import { LogoutAllCommand } from '../../application/commands/logout-all.command';
import { RevokeSessionCommand } from '../../application/commands/revoke-session.command';
import { LoginQuery } from '../../application/queries/login.query';
import { RefreshQuery } from '../../application/queries/refresh.query';
import { GetActiveSessionsQuery } from '../../application/queries/get-active-sessions.query';
import { JwtAuthGuard } from '@shared/infrastructure/guards';
import { JwtRefreshAuthGuard } from '../../application/guards/jwt-refresh-auth.guard';
import { UserPresenter } from '@iam/users/presentation/presenters/user.presenter';
import { PaginationQueryDto } from '@shared/infrastructure/dto/pagination-query.dto';
import { PaginatedResponsePresenter } from '@shared/infrastructure/presenters/pagination.presenter';
import { AuditLog } from '@shared/infrastructure/decorators/audit-log.decorator';
import type { Request } from 'express';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) { }

    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Register a new user' })
    @ApiResponse({ status: 201, description: 'User registered successfully' })
    @ApiResponse({ status: 400, description: 'User already exists or validation error' })
    async register(@Body() dto: RegisterDto) {
        const result = await this.commandBus.execute(new RegisterCommand({
            email: dto.email,
            username: dto.username,
            passwordRaw: dto.password,
        }));
        const user = result.unwrap();
        return UserPresenter.toResponse(user);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Log in with credentials' })
    @ApiResponse({ status: 200, description: 'Return Access Token and Refresh Token' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Body() dto: LoginDto, @Req() req: Request) {
        const ip = req.ip || req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || 'Unknown';
        const userAgent = req.headers['user-agent'] || 'Unknown';
        const result = await this.queryBus.execute(new LoginQuery(dto.email, dto.password, ip, userAgent));
        return result.unwrap();
    }

    @UseGuards(JwtRefreshAuthGuard)
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Refresh JWT access and refresh tokens' })
    @ApiResponse({ status: 200, description: 'Return new Access Token and Refresh Token' })
    @ApiResponse({ status: 401, description: 'Invalid refresh token' })
    async refresh(@Req() req: any) {
        const { user } = req;
        const result = await this.queryBus.execute(new RefreshQuery(user.user.id, user.user.email, user.jti));
        return result.unwrap();
    }

    @UseGuards(JwtRefreshAuthGuard)
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Logout from the current session' })
    @ApiResponse({ status: 200, description: 'Successfully logged out' })
    @ApiResponse({ status: 401, description: 'Invalid refresh token' })
    async logout(@Req() req: any) {
        const { user } = req;
        const result = await this.commandBus.execute(new LogoutCommand({
            userId: user.user.id,
            jti: user.jti,
        }));
        result.unwrap();
        return { success: true };
    }

    @UseGuards(JwtAuthGuard)
    @Post('logout/global')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Logout from all devices / active sessions' })
    @ApiResponse({ status: 200, description: 'Successfully logged out from all sessions' })
    @ApiResponse({ status: 401, description: 'Invalid access token' })
    @AuditLog('SESSION_REVOKE_ALL', (req) => 'Thu hồi toàn bộ các phiên hoạt động khác')
    async logoutAll(@Req() req: any) {
        const { user } = req;
        const result = await this.commandBus.execute(new LogoutAllCommand({
            userId: user.id,
        }));
        result.unwrap();
        return { success: true };
    }

    @UseGuards(JwtAuthGuard)
    @Get('sessions')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get active sessions for current user with pagination' })
    async getSessions(@Req() req: any, @Query() query: PaginationQueryDto) {
        const userId = req.user.id;
        const page = query.page || 1;
        const limit = query.limit || 10;
        const result = await this.queryBus.execute(new GetActiveSessionsQuery(userId, page, limit));
        const { sessions, total } = result.unwrap();
        return PaginatedResponsePresenter.toResponse(sessions, total, page, limit);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('sessions/:jti')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Revoke an active session by JTI' })
    @AuditLog('SESSION_REVOKE', (req) => `Thu hồi phiên đăng nhập: JTI ${req.params.jti}`)
    async revokeSession(@Param('jti') jti: string, @Req() req: any) {
        const userId = req.user.id;
        const result = await this.commandBus.execute(new RevokeSessionCommand({
            userId,
            jti,
        }));
        result.unwrap();
        return { success: true };
    }
}