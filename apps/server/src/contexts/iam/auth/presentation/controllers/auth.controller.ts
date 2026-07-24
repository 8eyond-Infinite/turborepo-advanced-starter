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
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RegisterDto, LoginDto } from '../dtos';
import {
    RegisterCommand,
    LoginCommand,
    RefreshCommand,
    LogoutCommand,
    LogoutAllCommand,
    RevokeSessionCommand,
} from '../../application/commands';

import {
    GetActiveSessionsQuery,
} from '../../application/queries';
import { JwtAuthGuard, JwtRefreshAuthGuard } from '@presentation/guards';
import { UserPresenter } from '@iam/users/presentation/presenters/user.presenter';
import { PaginationQueryDto } from '@presentation/common/dto/pagination-query.dto';
import { PaginatedResponsePresenter } from '@presentation/common/presenters/pagination.presenter';
import { AuditLog, GetUser, ClientInfo } from '@presentation/decorators';

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
    async login(@Body() dto: LoginDto, @ClientInfo() client: ClientInfo) {
        const result = await this.commandBus.execute(new LoginCommand(dto.email, dto.password, client.ip, client.userAgent));
        return result.unwrap();
    }

    @UseGuards(JwtRefreshAuthGuard)
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Refresh JWT access and refresh tokens' })
    @ApiResponse({ status: 200, description: 'Return new Access Token and Refresh Token' })
    @ApiResponse({ status: 401, description: 'Invalid refresh token' })
    async refresh(
        @GetUser('id') userId: string,
        @GetUser('email') email: string,
        @GetUser('jti') jti: string,
    ) {
        const result = await this.commandBus.execute(new RefreshCommand(userId, email, jti));
        return result.unwrap();
    }

    @UseGuards(JwtRefreshAuthGuard)
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Logout from the current session' })
    @ApiResponse({ status: 200, description: 'Successfully logged out' })
    @ApiResponse({ status: 401, description: 'Invalid refresh token' })
    async logout(
        @GetUser('id') userId: string,
        @GetUser('jti') jti: string,
    ) {
        const result = await this.commandBus.execute(new LogoutCommand({ userId, jti }));
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
    @AuditLog('SESSION_REVOKE_ALL', () => 'Thu hồi toàn bộ các phiên hoạt động khác')
    async logoutAll(@GetUser('id') userId: string) {
        const result = await this.commandBus.execute(new LogoutAllCommand({ userId }));
        result.unwrap();
        return { success: true };
    }

    @UseGuards(JwtAuthGuard)
    @Get('sessions')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get active sessions for current user with pagination' })
    async getSessions(
        @GetUser('id') userId: string,
        @Query() query: PaginationQueryDto,
    ) {
        const result = await this.queryBus.execute(new GetActiveSessionsQuery(userId, query.page, query.limit));
        const { sessions, total } = result.unwrap();
        return PaginatedResponsePresenter.toResponse(sessions, total, query.page, query.limit);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('sessions/:jti')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Revoke an active session by JTI' })
    @AuditLog('SESSION_REVOKE', (req) => `Thu hồi phiên đăng nhập: JTI ${req.params.jti}`)
    async revokeSession(
        @GetUser('id') userId: string,
        @Param('jti') jti: string,
    ) {
        const result = await this.commandBus.execute(new RevokeSessionCommand({ userId, jti }));
        result.unwrap();
        return { success: true };
    }
}