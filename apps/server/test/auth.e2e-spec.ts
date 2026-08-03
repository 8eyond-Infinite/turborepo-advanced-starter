import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { DomainExceptionFilter } from '../src/presentation/filters/domain-exception.filter';
import { RedisService } from '../src/infrastructure/cache/redis.service';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { USER_QUEUE } from '../src/contexts/iam/users/application/queues/user-queue.constants';
import { ConfigService } from '@nestjs/config';

describe('AuthController (E2E)', () => {
  let app: INestApplication;
  const testEmail = `e2e.${Date.now()}@example.com`;
  const testUsername = `e2e_${Date.now()}`;
  const testPassword = 'supersecretpassword';

  const waitForUnauthorizedRefresh = async (refreshToken: string) => {
    const deadline = Date.now() + 2_000;

    while (Date.now() < deadline) {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`);

      if (response.status === HttpStatus.UNAUTHORIZED) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    throw new Error('Refresh token was not revoked within 2 seconds');
  };

  const waitForQueueJob = async (
    queue: Queue,
    predicate: (job: { name: string; data: unknown }) => boolean,
  ) => {
    const deadline = Date.now() + 2_000;

    while (Date.now() < deadline) {
      const jobs = await queue.getJobs([
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed',
      ]);
      const job = jobs.find(predicate);
      if (job) return job;

      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    throw new Error('Expected queue job was not published within 2 seconds');
  };

  // The outbox publisher polls and dispatches asynchronously; on slow CI
  // runners a one-shot read races the PROCESSING -> PUBLISHED transition.
  const waitForOutboxPublished = async (
    prisma: PrismaService,
    aggregateId: string,
    type: string,
  ) => {
    const deadline = Date.now() + 5_000;

    while (Date.now() < deadline) {
      const outboxEvent = await prisma.outboxEvent.findFirst({
        where: { aggregateId, type },
      });
      if (outboxEvent?.status === 'PUBLISHED') {
        return outboxEvent;
      }

      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    throw new Error(
      `Outbox event ${type} for ${aggregateId} was not PUBLISHED within 5 seconds`,
    );
  };

  const waitForNotification = async (
    prisma: PrismaService,
    userId: string,
    title: string,
  ) => {
    const deadline = Date.now() + 5_000;

    while (Date.now() < deadline) {
      const notification = await prisma.notification.findFirst({
        where: { userId, title },
        orderBy: { createdAt: 'desc' },
      });
      if (notification) return notification;

      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    throw new Error(
      `Notification "${title}" for ${userId} was not created within 5 seconds`,
    );
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/health/live and /health/ready expose deployment probes', async () => {
    await request(app.getHttpServer())
      .get('/health/live')
      .expect(HttpStatus.OK)
      .expect(({ body }) => {
        expect(body.status).toBe('ok');
      });

    await request(app.getHttpServer())
      .get('/health/ready')
      .expect(HttpStatus.OK)
      .expect(({ body }) => {
        expect(body.checks).toEqual({
          database: 'up',
          redis: 'up',
        });
      });
  });

  it('/metrics protects and exposes the operational contract', async () => {
    await request(app.getHttpServer())
      .get('/metrics')
      .expect(HttpStatus.UNAUTHORIZED);

    const response = await request(app.getHttpServer())
      .get('/metrics')
      .set('Authorization', 'Bearer e2e-metrics-token')
      .expect(HttpStatus.OK)
      .expect('Content-Type', /text\/plain/);

    expect(response.text).toContain('http_request_duration_seconds');
    expect(response.text).toContain('outbox_events');
    expect(response.text).toContain(
      'bullmq_jobs{queue="user-queue",status="waiting"}',
    );
    expect(response.text).toContain(
      'bullmq_oldest_waiting_job_age_seconds{queue="user-queue"}',
    );
  });

  it('propagates or creates an HTTP correlation id', async () => {
    const suppliedId = `e2e-${Date.now()}`;
    const propagated = await request(app.getHttpServer())
      .get('/health/live')
      .set('x-correlation-id', suppliedId)
      .expect(HttpStatus.OK);
    expect(propagated.headers['x-correlation-id']).toBe(suppliedId);

    const generated = await request(app.getHttpServer())
      .get('/health/live')
      .expect(HttpStatus.OK);
    expect(generated.headers['x-correlation-id']).toEqual(expect.any(String));
  });

  it('/auth/register (POST) -> Nên đăng ký thành công', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: testEmail,
        username: testUsername,
        password: testPassword,
      })
      .expect(201);

    expect(response.body.email).toEqual(testEmail);

    // Verify that the welcome email job was added to BullMQ
    const userQueue = app.get<Queue>(getQueueToken(USER_QUEUE));
    const welcomeJob = await waitForQueueJob(
      userQueue,
      (job) =>
        job.name === 'send-welcome-email' &&
        typeof job.data === 'object' &&
        job.data !== null &&
        'email' in job.data &&
        job.data.email === testEmail,
    );
    expect(welcomeJob.name).toEqual('send-welcome-email');

    const prisma = app.get(PrismaService);
    const outboxEvent = await waitForOutboxPublished(
      prisma,
      response.body.id,
      'iam.user.registered.v1',
    );
    expect(outboxEvent.status).toBe('PUBLISHED');

    // Verify the complete asynchronous chain, not only its first outbox row:
    // registration → router → notification command → notification outbox.
    const notification = await waitForNotification(
      prisma,
      response.body.id,
      'Welcome!',
    );
    const notificationOutbox = await waitForOutboxPublished(
      prisma,
      notification.id,
      'notifications.notification.created.v1',
    );
    expect(notificationOutbox.status).toBe('PUBLISHED');
  });

  it('/auth/register (POST) -> rejects an invalid runtime payload', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'not-an-email',
        username: 'ab',
        password: '123',
        unexpected: true,
      })
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('/auth/email-verification -> blocks login until a one-time link is consumed', async () => {
    const config = app.get(ConfigService);
    config.set('EMAIL_VERIFICATION_REQUIRED', true);
    const email = `verify.${Date.now()}@example.com`;
    const password = 'verify-password-123';

    try {
      const registered = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, username: `verify_${Date.now()}`, password })
        .expect(HttpStatus.CREATED);
      expect(registered.body.emailVerificationRequired).toBe(true);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(HttpStatus.FORBIDDEN)
        .expect(({ body }) => expect(body.code).toBe('EMAIL_NOT_VERIFIED'));

      const unknown = await request(app.getHttpServer())
        .post('/auth/email-verification/request')
        .send({ email: `unknown.${Date.now()}@example.com` })
        .expect(HttpStatus.ACCEPTED);
      const known = await request(app.getHttpServer())
        .post('/auth/email-verification/request')
        .send({ email })
        .expect(HttpStatus.ACCEPTED);
      expect(known.body).toEqual(unknown.body);

      const queue = app.get<Queue>(getQueueToken(USER_QUEUE));
      const verificationJob = await waitForQueueJob(
        queue,
        (job) =>
          job.name === 'send-email-verification' &&
          typeof job.data === 'object' &&
          job.data !== null &&
          'email' in job.data &&
          job.data.email === email,
      );
      const verificationUrl = new URL(
        (verificationJob.data as { verificationUrl: string }).verificationUrl,
      );
      const token = verificationUrl.searchParams.get('token');
      expect(token).toBeTruthy();

      await request(app.getHttpServer())
        .post('/auth/email-verification/confirm')
        .send({ token })
        .expect(HttpStatus.OK);
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(HttpStatus.OK);
      await request(app.getHttpServer())
        .post('/auth/email-verification/confirm')
        .send({ token })
        .expect(HttpStatus.BAD_REQUEST)
        .expect(({ body }) =>
          expect(body.code).toBe('INVALID_EMAIL_VERIFICATION_TOKEN'),
        );
    } finally {
      config.set('EMAIL_VERIFICATION_REQUIRED', false);
    }
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

  it('/auth/refresh (POST) -> hai request đồng thời nhận cùng một kết quả rotation', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      })
      .expect(HttpStatus.OK);

    const refreshToken = loginRes.body.refreshToken as string;
    const responses = await Promise.all([
      request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`),
      request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`),
    ]);

    expect(responses.map((response) => response.status)).toEqual([
      HttpStatus.OK,
      HttpStatus.OK,
    ]);
    expect(responses[0].body).toEqual(responses[1].body);
  });

  it('/auth/refresh (POST) -> flow HttpOnly cookie: rotate cookie, không lộ refresh token qua body', async () => {
    // Login phải set refresh token vào HttpOnly cookie giới hạn path /auth
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testEmail, password: testPassword })
      .expect(200);

    const loginCookies = loginRes.headers['set-cookie'] as unknown as string[];
    const refreshCookie = loginCookies.find((c) =>
      c.startsWith('refresh_token='),
    );
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain('HttpOnly');
    expect(refreshCookie).toContain('Path=/auth');

    // Refresh bằng cookie (không có Authorization header): body chỉ có
    // access token — refresh token mới nằm trong cookie được rotate
    const refreshRes = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', loginCookies)
      .expect(200);

    expect(refreshRes.body).toHaveProperty('accessToken');
    expect(refreshRes.body).not.toHaveProperty('refreshToken');

    const rotatedCookies = refreshRes.headers[
      'set-cookie'
    ] as unknown as string[];
    const rotatedCookie = rotatedCookies.find((c) =>
      c.startsWith('refresh_token='),
    );
    expect(rotatedCookie).toBeDefined();
    expect(rotatedCookie).not.toEqual(refreshCookie);

    // Request đã cùng khởi hành với cookie cũ nhận đúng kết quả replay,
    // không tạo thêm một cặp token khác.
    const replayRes = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', loginCookies)
      .expect(HttpStatus.OK);
    const replayCookies = replayRes.headers[
      'set-cookie'
    ] as unknown as string[];
    expect(replayCookies.find((c) => c.startsWith('refresh_token='))).toEqual(
      rotatedCookie,
    );
  });

  it('/auth/password-reset -> one-time token changes password and revokes existing sessions', async () => {
    const resetEmail = `reset.${Date.now()}@example.com`;
    const resetOriginalPassword = 'reset-original-password-123';
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: resetEmail,
        username: `reset_${Date.now()}`,
        password: resetOriginalPassword,
      })
      .expect(HttpStatus.CREATED);
    const existingSession = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: resetEmail, password: resetOriginalPassword })
      .expect(HttpStatus.OK);

    const unknownResponse = await request(app.getHttpServer())
      .post('/auth/password-reset/request')
      .send({ email: `unknown.${Date.now()}@example.com` })
      .expect(HttpStatus.ACCEPTED);
    const knownResponse = await request(app.getHttpServer())
      .post('/auth/password-reset/request')
      .send({ email: resetEmail })
      .expect(HttpStatus.ACCEPTED);
    expect(knownResponse.body).toEqual(unknownResponse.body);

    const userQueue = app.get<Queue>(getQueueToken(USER_QUEUE));
    const resetJob = await waitForQueueJob(
      userQueue,
      (job) =>
        job.name === 'send-password-reset-email' &&
        typeof job.data === 'object' &&
        job.data !== null &&
        'email' in job.data &&
        job.data.email === resetEmail,
    );
    const resetUrl = new URL((resetJob.data as { resetUrl: string }).resetUrl);
    const resetToken = resetUrl.searchParams.get('token');
    expect(resetToken).toBeTruthy();

    const replacementPassword = 'replacement-password-123';
    await request(app.getHttpServer())
      .post('/auth/password-reset/confirm')
      .send({ token: resetToken, password: replacementPassword })
      .expect(HttpStatus.OK);

    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${existingSession.body.accessToken}`)
      .expect(HttpStatus.UNAUTHORIZED);
    await waitForUnauthorizedRefresh(existingSession.body.refreshToken);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: resetEmail, password: resetOriginalPassword })
      .expect(HttpStatus.UNAUTHORIZED);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: resetEmail, password: replacementPassword })
      .expect(HttpStatus.OK);

    await request(app.getHttpServer())
      .post('/auth/password-reset/confirm')
      .send({ token: resetToken, password: 'another-password-123' })
      .expect(HttpStatus.BAD_REQUEST)
      .expect(({ body }) => {
        expect(body.code).toBe('INVALID_PASSWORD_RESET_TOKEN');
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

    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data[0]).not.toHaveProperty('password');
    expect(response.body.meta).toEqual(
      expect.objectContaining({
        totalItems: expect.any(Number),
        currentPage: 1,
      }),
    );

    await request(app.getHttpServer())
      .get('/users?sortBy=password')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('/auth/refresh (POST) -> replay ngắn hạn không thể làm sống lại session đã logout', async () => {
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

    // Trong cửa sổ chống race, token cũ nhận lại chính kết quả lần 1.
    const replay = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);
    expect(replay.body.refreshToken).toBe(token2);

    // Logout session kế nhiệm phải xóa cả replay trỏ tới nó.
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${token2}`)
      .expect(200);

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

    const correlationId = 'e2e-global-logout-correlation';
    // Gọi global logout sử dụng accessToken của Session 1
    await request(app.getHttpServer())
      .post('/auth/logout/global')
      .set('Authorization', `Bearer ${access1}`)
      .set('x-correlation-id', correlationId)
      .expect(200);

    const prisma = app.get(PrismaService);
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        action: 'SESSION_REVOKE_ALL',
        userEmail: testEmail,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(auditLog).not.toBeNull();
    expect(auditLog?.correlationId).toBe(correlationId);

    // Thử refresh cả 2 session đều phải lỗi 401
    await waitForUnauthorizedRefresh(refresh1);
    await waitForUnauthorizedRefresh(refresh2);
  });

  it('/users lifecycle -> deactivates, reactivates and protects self deletion', async () => {
    // 1. Tạo User B
    const userBEmail = `user.b.${Date.now()}@example.com`;
    const userBPassword = 'userbpassword';
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: userBEmail,
        username: `user_b_${Date.now()}`,
        password: userBPassword,
      })
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
    const adminUser = await prisma.user.findFirst({
      where: { email: testEmail },
    });
    if (adminRole && adminUser) {
      await prisma.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: adminRole.id,
        },
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

    // Access tokens issued before deactivation are revoked immediately.
    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${accessB}`)
      .expect(HttpStatus.UNAUTHORIZED);

    // Thử refresh token của User B phải bị lỗi 401
    await waitForUnauthorizedRefresh(refreshB);

    // Explicit activation restores the account and permits a new session.
    await request(app.getHttpServer())
      .patch(`/users/${userBId}/activate`)
      .set('Authorization', `Bearer ${accessAdmin}`)
      .expect(HttpStatus.OK);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: userBEmail, password: userBPassword })
      .expect(HttpStatus.OK);

    // The token owner cannot delete their own administrator account.
    await request(app.getHttpServer())
      .delete(`/users/${adminUser?.id}`)
      .set('Authorization', `Bearer ${accessAdmin}`)
      .expect(HttpStatus.CONFLICT)
      .expect(({ body }) => {
        expect(body.code).toBe('USER_SELF_MUTATION_FORBIDDEN');
      });

    // Deleting another account is an explicit soft-delete operation.
    await request(app.getHttpServer())
      .delete(`/users/${userBId}`)
      .set('Authorization', `Bearer ${accessAdmin}`)
      .expect(HttpStatus.NO_CONTENT);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: userBEmail, password: userBPassword })
      .expect(HttpStatus.UNAUTHORIZED);
  });
});
