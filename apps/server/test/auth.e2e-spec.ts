import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DomainExceptionFilter } from '../src/shared/infrastructure/filters/domain-exception.filter';
import { RedisService } from '../src/shared/infrastructure/cache/redis.service';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { USER_QUEUE } from '../src/contexts/iam/users/application/queues/user-queue.constants';

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

        expect(response.body.email).toEqual(testEmail);

        // Verify that the welcome email job was added to BullMQ
        const userQueue = app.get<Queue>(getQueueToken(USER_QUEUE));
        const jobs = await userQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
        const welcomeJob = jobs.find((job) => job.data.email === testEmail);
        expect(welcomeJob).toBeDefined();
        expect(welcomeJob?.name).toEqual('send-welcome-email');
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

    it('/auth/refresh (POST) -> Đăng ký rotation: Token cũ phải không dùng lại được', async () => {
        const loginRes = await request(app.getHttpServer())
            .post('/auth/login')
            .send({
                email: testEmail,
                password: testPassword,
            })
            .expect(200);

        const { refreshToken: token1 } = loginRes.body;

        // Lần 1: Refresh thành công
        const refreshRes1 = await request(app.getHttpServer())
            .post('/auth/refresh')
            .set('Authorization', `Bearer ${token1}`)
            .expect(200);

        const { refreshToken: token2 } = refreshRes1.body;
        expect(token2).toBeDefined();

        // Lần 2: Dùng lại token1 (cũ) phải bị lỗi 401
        await request(app.getHttpServer())
            .post('/auth/refresh')
            .set('Authorization', `Bearer ${token1}`)
            .expect(401);
    });

    it('/auth/logout (POST) -> Đăng xuất đơn lẻ thành công', async () => {
        const loginRes = await request(app.getHttpServer())
            .post('/auth/login')
            .send({
                email: testEmail,
                password: testPassword,
            })
            .expect(200);

        const { refreshToken } = loginRes.body;

        // Gọi logout với refresh token
        await request(app.getHttpServer())
            .post('/auth/logout')
            .set('Authorization', `Bearer ${refreshToken}`)
            .expect(200);

        // Thử refresh lại phải bị lỗi 401
        await request(app.getHttpServer())
            .post('/auth/refresh')
            .set('Authorization', `Bearer ${refreshToken}`)
            .expect(401);
    });

    it('/auth/logout/global (POST) -> Đăng xuất tất cả thiết bị thành công', async () => {
        // Tạo Session 1
        const loginRes1 = await request(app.getHttpServer())
            .post('/auth/login')
            .send({
                email: testEmail,
                password: testPassword,
            })
            .expect(200);

        // Tạo Session 2
        const loginRes2 = await request(app.getHttpServer())
            .post('/auth/login')
            .send({
                email: testEmail,
                password: testPassword,
            })
            .expect(200);

        const { accessToken: access1, refreshToken: refresh1 } = loginRes1.body;
        const { refreshToken: refresh2 } = loginRes2.body;

        // Gọi global logout sử dụng accessToken của Session 1
        await request(app.getHttpServer())
            .post('/auth/logout/global')
            .set('Authorization', `Bearer ${access1}`)
            .expect(200);

        // Thử refresh cả 2 session đều phải lỗi 401
        await request(app.getHttpServer())
            .post('/auth/refresh')
            .set('Authorization', `Bearer ${refresh1}`)
            .expect(401);

        await request(app.getHttpServer())
            .post('/auth/refresh')
            .set('Authorization', `Bearer ${refresh2}`)
            .expect(401);
    });

    it('/users/:id/deactivate (PATCH) -> Nên hủy kích hoạt user, xóa cache users:all, users:me và buộc đăng xuất', async () => {
        // 1. Tạo User B
        const userBEmail = `user.b.${Date.now()}@example.com`;
        const userBPassword = 'userbpassword';
        await request(app.getHttpServer())
            .post('/auth/register')
            .send({ email: userBEmail, password: userBPassword })
            .expect(201);

        // Login User B to get their tokens
        const loginResB = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: userBEmail, password: userBPassword })
            .expect(200);

        const { accessToken: accessB, refreshToken: refreshB } = loginResB.body;

        // Fetch user:me for User B (populates cache)
        const meResB = await request(app.getHttpServer())
            .get('/users/me')
            .set('Authorization', `Bearer ${accessB}`)
            .expect(200);

        const userBId = meResB.body.id;

        // 2. Cấp quyền ADMIN cho testEmail (Admin)
        const prisma = app.get(PrismaService);
        const adminRole = await prisma.role.findFirst({ where: { name: 'ADMIN' } });
        const adminUser = await prisma.user.findFirst({ where: { email: testEmail } });
        if (adminRole && adminUser) {
            await prisma.userRole.create({
                data: {
                    userId: adminUser.id,
                    roleId: adminRole.id,
                }
            });
        }

        // Login Admin to get token (now as Admin)
        const loginResAdmin = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: testEmail, password: testPassword })
            .expect(200);

        const { accessToken: accessAdmin } = loginResAdmin.body;

        // Fetch users list (populates users:all cache)
        await request(app.getHttpServer())
            .get('/users')
            .set('Authorization', `Bearer ${accessAdmin}`)
            .expect(200);

        // Verify caches exist in Redis
        const redisService = app.get(RedisService);
        const cacheMeKey = `users:me:${userBId}`;
        const cacheAllKey = `users:all`;

        expect(await redisService.get(cacheMeKey)).toBeDefined();
        expect(await redisService.get(cacheAllKey)).toBeDefined();

        // 3. Admin hủy kích hoạt User B
        await request(app.getHttpServer())
            .patch(`/users/${userBId}/deactivate`)
            .set('Authorization', `Bearer ${accessAdmin}`)
            .expect(200);

        // 4. Kiểm tra caches và refresh token trong Redis phải bị xóa sạch (evicted)
        expect(await redisService.get(cacheMeKey)).toBeNull();
        expect(await redisService.get(cacheAllKey)).toBeNull();

        // Thử refresh token của User B phải bị lỗi 401
        await request(app.getHttpServer())
            .post('/auth/refresh')
            .set('Authorization', `Bearer ${refreshB}`)
            .expect(401);
    });
});