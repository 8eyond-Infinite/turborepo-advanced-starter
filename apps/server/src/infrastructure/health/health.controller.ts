import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { RedisService } from '@infrastructure/cache/redis.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('live')
  @ApiOperation({ summary: 'Process liveness probe' })
  live() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Database and Redis readiness probe' })
  async ready() {
    const checks = await Promise.allSettled([
      this.prisma.$queryRaw`SELECT 1`,
      this.redis.ping(),
    ]);
    const database = checks[0].status === 'fulfilled' ? 'up' : 'down';
    const redis = checks[1].status === 'fulfilled' ? 'up' : 'down';

    if (database === 'down' || redis === 'down') {
      throw new ServiceUnavailableException({
        status: 'error',
        checks: { database, redis },
      });
    }

    return {
      status: 'ok',
      checks: { database, redis },
      timestamp: new Date().toISOString(),
    };
  }
}
