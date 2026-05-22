import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorageService, getStorageToken } from '@nestjs/throttler';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { testDataSource } from './helpers/test-data-source';

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

afterAll(async () => {
  await app.close();
  await testDataSource.destroy();
});

describe('GET /health', () => {
  it('returns response envelope with statusCode 200', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);

    expect(res.body).toMatchObject({
      statusCode: 200,
    });
    expect(res.body.message).toBeDefined();
    expect(res.body.data).toBeDefined();
  });

  it('returns data with status ok', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);

    expect(res.body.data.status).toBe('ok');
  });

  it('responds with Vietnamese success message by default (fallback locale vi)', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);

    // Default locale is vi — message key common.success resolves to "Thành công"
    expect(res.body.message).toBe('Thành công');
  });

  it('responds with English success message when x-lang: en is set', async () => {
    const res = await request(app.getHttpServer()).get('/health').set('x-lang', 'en').expect(200);

    // common.success in en resolves to "OK"
    expect(res.body.message).toBe('OK');
  });
});
