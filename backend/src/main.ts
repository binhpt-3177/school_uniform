import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Use pino logger
  app.useLogger(app.get(Logger));

  // Security middleware
  app.use(helmet());

  // Cookie parser — uses COOKIE_SECRET when present
  const cookieSecret = process.env.COOKIE_SECRET;
  app.use(cookieSecret ? cookieParser(cookieSecret) : cookieParser());

  // CORS — parse csv origins, reject wildcard with credentials
  const rawOrigins = process.env.CORS_ORIGINS ?? 'http://localhost:5000';
  const allowedOrigins = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (same-origin, curl, mobile apps)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS policy: origin ${origin} is not allowed`));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'x-lang', 'Accept-Language'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // NOTE: ResponseInterceptor, ClassSerializerInterceptor, and AllExceptionsFilter
  // are registered via APP_INTERCEPTOR / APP_FILTER providers in app.module.ts.
  // Registering them again here would cause double-wrapping. Do NOT add useGlobalInterceptors
  // or useGlobalFilters for these — app.module.ts DI providers are authoritative.

  // Swagger — enabled when SWAGGER_ENABLED=true OR not in production
  const swaggerEnabled =
    process.env.SWAGGER_ENABLED === 'true' || process.env.NODE_ENV !== 'production';

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Design Website API')
      .setDescription('NestJS 11 base architecture API')
      .setVersion('0.1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .addCookieAuth('access_token', { type: 'apiKey', in: 'cookie', name: 'access_token' })
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port);

  const logger = app.get(Logger);
  logger.log(`Application listening on port ${port}`, 'Bootstrap');
  if (swaggerEnabled) {
    logger.log(`Swagger UI available at http://localhost:${port}/docs`, 'Bootstrap');
  }
}

bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
