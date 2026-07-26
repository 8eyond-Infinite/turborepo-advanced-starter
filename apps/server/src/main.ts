// Load .env into process.env before any module is evaluated, so values are
// available to decorators that run at import time (e.g. the realtime
// gateway's CORS origin list).
import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DomainExceptionFilter } from '@presentation/filters/domain-exception.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { parseCorsOrigins } from './config/environment';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  const configService = app.get(ConfigService);
  app.enableShutdownHooks();

  // Deployments sit behind a reverse proxy; required for correct client IPs
  // in rate limiting and audit logs.
  app.set('trust proxy', 1);

  // Đọc HttpOnly refresh cookie ở các endpoint /auth/*
  app.use(cookieParser());

  app.use(
    helmet({
      // Swagger UI and cross-origin avatar images need these relaxations.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Serve static upload assets locally
  app.useStaticAssets(join(process.cwd(), 'public'), {
    prefix: '/public',
  });

  app.enableCors({
    origin: parseCorsOrigins(configService.getOrThrow<string>('CORS_ORIGINS')),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new DomainExceptionFilter());

  // API documentation is a development/staging tool, not a production surface.
  if (configService.get<string>('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Turborepo Advanced Starter API')
      .setDescription(
        'The API documentation for the Turborepo Advanced Starter kit',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  const port = configService.getOrThrow<number>('PORT');
  await app.listen(port);
}
void bootstrap();
