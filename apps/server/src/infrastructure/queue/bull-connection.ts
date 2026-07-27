import { ConfigService } from '@nestjs/config';
import { buildRedisConnection } from '../cache/redis-connection';

// Dùng chung giữa API process (producer) và worker process (consumer)
// để hai bên không bao giờ lệch cấu hình kết nối Redis.
export const buildBullConnection = (configService: ConfigService) => ({
  connection: buildRedisConnection(configService),
});
