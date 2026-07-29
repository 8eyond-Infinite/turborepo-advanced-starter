import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { QueryBus, CommandBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@presentation/guards';
import { GetUser } from '@presentation/decorators';
import { GetNotificationsQuery } from '../../application/queries/get-notifications.query';
import { MarkNotificationReadCommand } from '../../application/commands/mark-read.command';
import { PaginationQueryDto } from '@presentation/common/dto/pagination-query.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get current user notifications' })
  @ApiResponse({ status: 200, description: 'Return list of notifications' })
  async getNotifications(
    @GetUser('id') userId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    const result = await this.queryBus.execute(
      new GetNotificationsQuery(userId, pagination.page, pagination.limit),
    );

    if (result.isFailure) throw result.getError();

    return result.getValue();
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark specific notification as read' })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read successfully',
  })
  async markAsRead(
    @GetUser('id') userId: string,
    @Param('id') notificationId: string,
  ) {
    const result = await this.commandBus.execute(
      new MarkNotificationReadCommand({
        userId,
        notificationId,
        all: false,
      }),
    );

    if (result.isFailure) throw result.getError();

    return { success: true };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read successfully',
  })
  async markAllAsRead(@GetUser('id') userId: string) {
    const result = await this.commandBus.execute(
      new MarkNotificationReadCommand({
        userId,
        all: true,
      }),
    );

    if (result.isFailure) throw result.getError();

    return { success: true };
  }
}
