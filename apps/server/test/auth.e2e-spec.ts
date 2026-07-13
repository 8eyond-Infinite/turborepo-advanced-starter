import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DomainExceptionFilter } from '../src/shared/infrastructure/filters/domain-exception.filter';

describe('AuthController (E2E)', () => {
    let app: INestApplication;
    const testEmail = `e2e.${Date.now()}@example.com`;
    const testPassword = 'supersecretpassword';

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
        app.useGlobalFilters(new DomainExceptionFilter());
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('/auth/register (POST) -> Nên đăng ký thành công', async () => {
        const response = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                email: testEmail,
                password: testPassword,
            })
            .expect(201);

        expect(response.body.message).toEqual('User registered successfully');
    });

    it('/auth/login (POST) -> Nên trả về Access & Refresh Token', async () => {
        return request(app.getHttpServer())
            .post('/auth/login')
            .send({
                email: testEmail,
                password: testPassword,
            })
            .expect(200)
            .expect((res) => {
                expect(res.body).toHaveProperty('accessToken');
                expect(res.body).toHaveProperty('refreshToken');
            });
    });

    it('/auth/refresh (POST) -> Nên làm mới token thành công', async () => {
        const loginRes = await request(app.getHttpServer())
            .post('/auth/login')
            .send({
                email: testEmail,
                password: testPassword,
            })
            .expect(200);

        const { refreshToken } = loginRes.body;

        return request(app.getHttpServer())
            .post('/auth/refresh')
            .set('Authorization', `Bearer ${refreshToken}`)
            .expect(200)
            .expect((res) => {
                expect(res.body).toHaveProperty('accessToken');
                expect(res.body).toHaveProperty('refreshToken');
            });
    });
});