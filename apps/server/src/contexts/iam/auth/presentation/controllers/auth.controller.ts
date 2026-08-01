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
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  RegisterDto,
  LoginDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
  VerifyEmailDto,
  RequestEmailVerificationDto,
} from '../dtos';
import {
  RegisterCommand,
  LoginCommand,
  RefreshCommand,
  LogoutCommand,
  LogoutAllCommand,
  RevokeSessionCommand,
  RevokeOtherSessionsCommand,
  RequestPasswordResetCommand,
  ResetPasswordCommand,
  VerifyEmailCommand,
  RequestEmailVerificationCommand,
} from '../../application/commands';

import { GetActiveSessionsQuery } from '../../application/queries';
import { JwtAuthGuard, JwtRefreshAuthGuard } from '@presentation/guards';
import { UserPresenter } from '@iam/users/presentation/presenters/user.presenter';
import { PaginationQueryDto } from '@presentation/common/dto/pagination-query.dto';
import { PaginatedResponsePresenter } from '@presentation/common/presenters/pagination.presenter';
import { AuditLog, GetUser, ClientInfo } from '@presentation/decorators';
import {
  clearRefreshCookie,
  refreshTokenFromCookie,
  setRefreshCookie,
} from '../refresh-cookie';

@ApiTags('Authentication')
@Throttle({ default: { limit: 20, ttl: 60_000 } })
@Controller('auth')
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('password-reset/request')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiResponse({ status: 202, description: 'Request accepted' })
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    await this.commandBus.execute(new RequestPasswordResetCommand(dto.email));
    return {
      accepted: true,
      message: 'If the account exists, a reset link will be sent.',
    };
  }

  @Post('password-reset/confirm')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset a password with a one-time token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Token invalid or expired' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.commandBus.execute(
      new ResetPasswordCommand(dto.token, dto.password),
    );
    return { success: true };
  }

  @Post('email-verification/request')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.ACCEPTED)
  async requestEmailVerification(@Body() dto: RequestEmailVerificationDto) {
    await this.commandBus.execute(
      new RequestEmailVerificationCommand(dto.email),
    );
    return {
      accepted: true,
      message: 'If verification is needed, a link will be sent.',
    };
  }

  @Post('email-verification/confirm')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.commandBus.execute(new VerifyEmailCommand(dto.token));
    return { success: true };
  }

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({
    status: 400,
    description: 'User already exists or validation error',
  })
  async register(@Body() dto: RegisterDto) {
    const result = await this.commandBus.execute(
      new RegisterCommand({
        email: dto.email,
        username: dto.username,
        passwordRaw: dto.password,
      }),
    );
    const user = result.unwrap();
    return {
      ...UserPresenter.toResponse(user),
      emailVerificationRequired: !user.emailVerifiedAt,
    };
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with credentials' })
  @ApiResponse({
    status: 200,
    description: 'Return Access Token and Refresh Token',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @ClientInfo() client: ClientInfo,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.commandBus.execute(
      new LoginCommand(dto.email, dto.password, client.ip, client.userAgent),
    );
    const tokens = result.unwrap() as {
      accessToken: string;
      refreshToken: string;
    };
    // Trình duyệt giữ refresh token trong HttpOnly cookie; body vẫn trả đủ
    // cặp token cho API client không dùng cookie (mobile, script, E2E).
    setRefreshCookie(res, tokens.refreshToken);
    return tokens;
  }

  @UseGuards(JwtRefreshAuthGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh JWT access and refresh tokens' })
  @ApiResponse({
    status: 200,
    description: 'Return new Access Token and Refresh Token',
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(
    @GetUser('id') userId: string,
    @GetUser('email') email: string,
    @GetUser('jti') jti: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.commandBus.execute(
      new RefreshCommand(userId, email, jti),
    );
    const tokens = result.unwrap() as {
      accessToken: string;
      refreshToken: string;
    };
    setRefreshCookie(res, tokens.refreshToken);

    // Client xác thực bằng cookie thì token mới cũng chỉ nằm trong cookie —
    // không trả refresh token qua body để XSS không đọc trộm được.
    if (refreshTokenFromCookie(req)) {
      return { accessToken: tokens.accessToken };
    }
    return tokens;
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
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.commandBus.execute(
      new LogoutCommand({ userId, jti }),
    );
    result.unwrap();
    clearRefreshCookie(res);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout/global')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from all devices / active sessions' })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged out from all sessions',
  })
  @ApiResponse({ status: 401, description: 'Invalid access token' })
  @AuditLog(
    'SESSION_REVOKE_ALL',
    () => 'Thu hồi toàn bộ các phiên hoạt động khác',
  )
  async logoutAll(
    @GetUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.commandBus.execute(
      new LogoutAllCommand({ userId }),
    );
    result.unwrap();
    clearRefreshCookie(res);
    return { success: true };
  }

  @UseGuards(JwtRefreshAuthGuard)
  @Post('sessions/revoke-others')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke every session except the current one' })
  @AuditLog(
    'SESSION_REVOKE_OTHERS',
    () => 'Thu hồi toàn bộ phiên hoạt động ngoại trừ phiên hiện tại',
  )
  async revokeOtherSessions(
    @GetUser('id') userId: string,
    @GetUser('sessionId') currentSessionId: string,
  ) {
    const result = await this.commandBus.execute(
      new RevokeOtherSessionsCommand(userId, currentSessionId),
    );
    result.unwrap();
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get active sessions for current user with pagination',
  })
  async getSessions(
    @GetUser('id') userId: string,
    @GetUser('jti') currentJti: string | undefined,
    @Query() query: PaginationQueryDto,
  ) {
    const result = await this.queryBus.execute(
      new GetActiveSessionsQuery(userId, query.page, query.limit, currentJti),
    );
    const { sessions, total } = result.unwrap();
    return PaginatedResponsePresenter.toResponse(
      sessions,
      total,
      query.page,
      query.limit,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:jti')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke an active session by JTI' })
  @AuditLog(
    'SESSION_REVOKE',
    (req) => `Thu hồi phiên đăng nhập: JTI ${String(req.params.jti)}`,
  )
  async revokeSession(
    @GetUser('id') userId: string,
    @Param('jti') jti: string,
  ) {
    const result = await this.commandBus.execute(
      new RevokeSessionCommand({ userId, jti }),
    );
    result.unwrap();
    return { success: true };
  }
}
