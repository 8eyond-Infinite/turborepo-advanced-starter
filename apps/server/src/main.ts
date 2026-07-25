import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DomainExceptionFilter } from '@presentation/filters/domain-exception.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { parseCorsOrigins } from './config/environment';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  app.enableShutdownHooks();

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

  // Configure Swagger
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

  const port = configService.getOrThrow<number>('PORT');
  await app.listen(port);
}
void bootstrap();

// TODO: Setup Redis
// TODO: Setup Authentication
// TODO: Setup Socket.IO
// TODO: Setup Worker
