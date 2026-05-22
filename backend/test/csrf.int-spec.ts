import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorageService, getStorageToken } from '@nestjs/throttler';
import * as argon2 from 'argon2';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { User } from '../src/users/entities/user.entity';
import { testDataSource } from './helpers/test-data-source';
import { truncateAll } from './helpers/truncate-all';

let app: INestApplication;

beforeAll(async () => {
  await testDataSource.initialize();
  await testDataSource.runMigrations();

  const noopStorage = {
    increment: async () => ({
      totalHits: 1,
      timeToExpire: 0,
      isBlocked: false,
      timeToBlockExpire: 0,
    }),
    onApplicationShutdown: () => undefined,
  } as unknown as ThrottlerStorageService;

  const storageToken = getStorageToken();

  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(storageToken)
    .useValue(noopStorage)
    .compile();

  app = module.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();
});

beforeEach(async () => {
  await truncateAll(testDataSource);
});

afterAll(async () => {
  await app.close();
  await testDataSource.destroy();
});

const ADMIN_EMAIL = 'admin-csrf@example.com';
const ADMIN_PASSWORD = 'Admin@12345';

async function seedAdmin(): Promise<void> {
  const userRepo = testDataSource.getRepository(User);
  const passwordHash = await argon2.hash(ADMIN_PASSWORD, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
  const admin = userRepo.create({
    email: ADMIN_EMAIL,
    passwordHash,
    firstName: 'Admin',
    lastName: 'Test',
    role: 'admin',
  });
  await userRepo.save(admin);
}

function getCookies(res: request.Response): string[] {
  return (res.headers['set-cookie'] as unknown as string[]) ?? [];
}

function cookieHeader(setCookies: string[]): string {
  return setCookies.map((c) => c.split(';')[0].trim()).join('; ');
}

function cookieValue(setCookies: string[], name: string): string | undefined {
  const entry = setCookies.find((c) => c.startsWith(`${name}=`));
  return entry?.split(';')[0].split('=')[1];
}

async function loginAdmin(): Promise<string[]> {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  return getCookies(res);
}

describe('CSRF guard on mutating endpoints', () => {
  // /auth/logout is protected (JWT required), mutating (POST), and CSRF-guarded.
  // Used here as the canary mutating endpoint for CSRF assertions.

  it('POST /auth/logout without X-CSRF-Token header returns 403 CSRF_INVALID', async () => {
    await seedAdmin();
    const cookies = await loginAdmin();

    const res = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', cookieHeader(cookies))
      // Deliberately omit x-csrf-token header
      .expect(403);

    expect(res.body.error).toBe('CSRF_INVALID');
  });

  it('POST /auth/logout with mismatched X-CSRF-Token returns 403 CSRF_INVALID', async () => {
    await seedAdmin();
    const cookies = await loginAdmin();

    const res = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', cookieHeader(cookies))
      .set('x-csrf-token', 'wrong-token-value')
      .expect(403);

    expect(res.body.error).toBe('CSRF_INVALID');
  });

  it('POST /auth/logout with matching cookie + header returns 204', async () => {
    await seedAdmin();
    const cookies = await loginAdmin();
    const csrfToken = cookieValue(cookies, 'csrf_token') ?? '';

    expect(csrfToken).toBeTruthy();

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', cookieHeader(cookies))
      .set('x-csrf-token', csrfToken)
      .expect(204);
  });
});
