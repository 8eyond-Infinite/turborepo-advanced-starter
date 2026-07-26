// Load .env trước khi module nào được đánh giá — giống main.ts.
import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
  new Logger('Worker').log(
    'Worker process started — consuming user-queue jobs',
  );
}
void bootstrap();
