import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DomainExceptionFilter } from '../src/shared/infrastructure/filters/domain-exception.filter';
import { RedisService } from '../src/shared/infrastructure/cache/redis.service';

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

    it('/users/me (GET) -> Nên lấy được thông tin cá nhân của người dùng đăng nhập', async () => {
        const loginRes = await request(app.getHttpServer())
            .post('/auth/login')
            .send({
                email: testEmail,
                password: testPassword,
            })
            .expect(200);

        const { accessToken } = loginRes.body;

        const response = await request(app.getHttpServer())
            .get('/users/me')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body.email).toEqual(testEmail);
        expect(response.body).not.toHaveProperty('password');

        // Verify that the response is cached in Redis
        const redisService = app.get(RedisService);
        const cacheKey = `users:me:${response.body.id}`;
        const cachedData = await redisService.get<any>(cacheKey);
        expect(cachedData).toBeDefined();
        expect(cachedData).toHaveProperty('email', testEmail);
    });

    it('/users (GET) -> Nên lấy được danh sách user vì mặc định có quyền user:read', async () => {
        const loginRes = await request(app.getHttpServer())
            .post('/auth/login')
            .send({
                email: testEmail,
                password: testPassword,
            })
            .expect(200);

        const { accessToken } = loginRes.body;

        const response = await request(app.getHttpServer())
            .get('/users')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0]).not.toHaveProperty('password');
    });
});