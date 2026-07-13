import { 
    Controller, 
    Post, 
    Body, 
    HttpCode, 
    HttpStatus, 
    UseGuards, 
    Req
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RegisterDto, LoginDto } from '../dtos';
import { RegisterCommand } from '../../application/commands/register.command';
import { LoginQuery } from '../../application/queries/login.query';
import { RefreshQuery } from '../../application/queries/refresh.query';
import { JwtRefreshAuthGuard } from '../../application/guards/jwt-refresh-auth.guard';
import { UserPresenter } from '@iam/users/presentation/presenters/user.presenter';

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
        const result = await this.commandBus.execute(new RegisterCommand(dto.email, dto.password));
        const user = result.unwrap();
        return UserPresenter.toResponse(user);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Log in with credentials' })
    @ApiResponse({ status: 200, description: 'Return Access Token and Refresh Token' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Body() dto: LoginDto) {
        const result = await this.queryBus.execute(new LoginQuery(dto.email, dto.password));
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
        return await this.queryBus.execute(new RefreshQuery(user.user.id, user.user.email));
    }
}