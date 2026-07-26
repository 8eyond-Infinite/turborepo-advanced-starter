import { ConfigService } from '@nestjs/config';

// Dùng chung giữa API process (producer) và worker process (consumer)
// để hai bên không bao giờ lệch cấu hình kết nối Redis.
export const buildBullConnection = (configService: ConfigService) => ({
  connection: {
    host: configService.get<string>('REDIS_HOST', 'localhost'),
    port: Number(configService.get<number>('REDIS_PORT', 6380)),
    password: configService.get<string>('REDIS_PASSWORD') || undefined,
  },
});
