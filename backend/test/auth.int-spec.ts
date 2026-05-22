import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorageService, getStorageToken } from '@nestjs/throttler';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { testDataSource } from './helpers/test-data-source';
import { truncateAll } from './helpers/truncate-all';

let app: INestApplication;

beforeAll(async () => {
  await testDataSource.initialize();
  await testDataSource.runMigrations();

  // Override throttler storage so all requests appear as fresh (totalHits=1 < any limit)
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
  // Mirror main.ts CORS config so preflight tests are meaningful
  app.enableCors({
    origin: ['http://localhost:5000'],
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'x-lang', 'Accept-Language'],
  });
  await app.init();
});

beforeEach(async () => {
  await truncateAll(testDataSource);
});

afterAll(async () => {
  await app.close();
  await testDataSource.destroy();
});

/** Raw Set-Cookie header values from a response */
function getCookies(res: request.Response): string[] {
  return (res.headers['set-cookie'] as unknown as string[]) ?? [];
}

/**
 * Convert Set-Cookie header strings to a single Cookie request header value.
 * Strips cookie attributes (Path, HttpOnly, Max-Age, etc) — only name=value pairs are sent.
 */
function cookieHeader(setCookies: string[]): string {
  return setCookies.map((c) => c.split(';')[0].trim()).join('; ');
}

/** Extract the value of a named cookie from Set-Cookie strings */
function cookieValue(setCookies: string[], name: string): string | undefined {
  const entry = setCookies.find((c) => c.startsWith(`${name}=`));
  return entry?.split(';')[0].split('=')[1];
}

const REGISTER_PAYLOAD = {
  email: 'test@example.com',
  password: 'Password@1234',
  firstName: 'Test',
  lastName: 'User',
};

describe('POST /auth/register', () => {
  it('creates a user and returns id + email', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(REGISTER_PAYLOAD)
      .expect(201);

    expect(res.body.data).toMatchObject({ email: REGISTER_PAYLOAD.email });
    expect(res.body.data.id).toBeDefined();
  });

  it('returns 409 on duplicate email', async () => {
    await request(app.getHttpServer()).post('/auth/register').send(REGISTER_PAYLOAD);
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(REGISTER_PAYLOAD)
      .expect(409);
    expect(res.body.error).toBe('EMAIL_TAKEN');
  });
});

describe('POST /auth/login', () => {
  it('sets access_token, refresh_token, csrf_token cookies on success', async () => {
    await request(app.getHttpServer()).post('/auth/register').send(REGISTER_PAYLOAD);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: REGISTER_PAYLOAD.email, password: REGISTER_PAYLOAD.password })
      .expect(200);

    const cookieStr = getCookies(res).join('; ');
    expect(cookieStr).toMatch(/access_token=/);
    expect(cookieStr).toMatch(/refresh_token=/);
    expect(cookieStr).toMatch(/csrf_token=/);
  });

  it('returns 401 for wrong password', async () => {
    await request(app.getHttpServer()).post('/auth/register').send(REGISTER_PAYLOAD);
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: REGISTER_PAYLOAD.email, password: 'wrongpass' })
      .expect(401);
    expect(res.body.error).toBe('INVALID_CREDENTIALS');
  });
});

describe('Token rotation — refresh + replay detection', () => {
  let loginCookies: string[];

  beforeEach(async () => {
    await request(app.getHttpServer()).post('/auth/register').send(REGISTER_PAYLOAD);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: REGISTER_PAYLOAD.email, password: REGISTER_PAYLOAD.password });

    loginCookies = getCookies(loginRes);
  });

  it('issues new tokens on valid refresh', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookieHeader(loginCookies))
      .expect(204);

    const newCookies = getCookies(res);
    expect(newCookies.length).toBeGreaterThan(0);
    const cookieStr = newCookies.join('; ');
    expect(cookieStr).toMatch(/access_token=/);
    expect(cookieStr).toMatch(/refresh_token=/);
  });

  it('revokes entire family when refresh token is reused', async () => {
    const cookieStr = cookieHeader(loginCookies);

    // First refresh — marks original as used, issues new pair
    await request(app.getHttpServer()).post('/auth/refresh').set('Cookie', cookieStr).expect(204);

    // Reuse original refresh token (replay attack) — should revoke entire family
    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookieStr)
      .expect(401);

    expect(res.body.error).toBe('REFRESH_REUSED');
  });
});

describe('POST /auth/logout', () => {
  it('clears cookies and revokes family', async () => {
    await request(app.getHttpServer()).post('/auth/register').send(REGISTER_PAYLOAD);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: REGISTER_PAYLOAD.email, password: REGISTER_PAYLOAD.password });

    const cookies = getCookies(loginRes);
    const csrfValue = cookieValue(cookies, 'csrf_token');

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', cookieHeader(cookies))
      .set('x-csrf-token', csrfValue ?? '')
      .expect(204);

    // After logout the refresh token should be invalidated
    const refreshCookieVal = cookieValue(cookies, 'refresh_token');
    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', `refresh_token=${refreshCookieVal}`)
      .expect(401);

    expect(res.body.error).toMatch(/TOKEN_INVALID|TOKEN_MISSING/);
  });
});

describe('GET /auth/me', () => {
  it('returns user info with valid access_token', async () => {
    await request(app.getHttpServer()).post('/auth/register').send(REGISTER_PAYLOAD);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: REGISTER_PAYLOAD.email, password: REGISTER_PAYLOAD.password })
      .expect(200);

    const cookies = getCookies(loginRes);

    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', cookieHeader(cookies))
      .expect(200);

    expect(res.body.data.email).toBe(REGISTER_PAYLOAD.email);
  });

  it('returns 401 without cookie', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });
});

describe('CORS preflight — OPTIONS /auth/login', () => {
  it('responds with 204 and Access-Control-Allow-Credentials: true for allowed origin', async () => {
    const res = await request(app.getHttpServer())
      .options('/auth/login')
      .set('Origin', 'http://localhost:5000')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type')
      .expect(204);

    expect(res.headers['access-control-allow-credentials']).toBe('true');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5000');
  });
});
