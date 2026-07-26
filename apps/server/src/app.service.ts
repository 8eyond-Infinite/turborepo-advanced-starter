import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return {
      message: 'Turborepo Advanced Starter API',
      docs: '/api',
      health: '/health/ready',
    };
  }
}
