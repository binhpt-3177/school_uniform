import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AcceptLanguageResolver, HeaderResolver, I18nModule, QueryResolver } from 'nestjs-i18n';
import { LoggerModule } from 'nestjs-pino';
import { CommandModule } from 'nestjs-command';
import * as path from 'path';

import configuration from './config/configuration';
import { envValidationSchema } from './config/env-validation.schema';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { CsrfGuard } from './common/guards/csrf.guard';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SeedCommand } from './commands/seed.command';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users/entities/user.entity';

@Module({
  imports: [
    // Config — global, validates env at startup
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),

    // Rate limiting — 60 req/min global default
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),

    // i18n — loads from dist/i18n at runtime (nest-cli copies src/i18n → dist/i18n)
    I18nModule.forRoot({
      fallbackLanguage: process.env.DEFAULT_LOCALE ?? 'vi',
      loaderOptions: {
        path: path.join(__dirname, '/i18n/'),
        watch: process.env.NODE_ENV === 'development',
      },
      resolvers: [
        new QueryResolver(['lang']),
        new HeaderResolver(['x-lang', 'accept-language']),
        AcceptLanguageResolver,
      ],
    }),

    // Request logging via pino
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        redact: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token'],
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
            : undefined,
      },
    }),

    // Console commands (nestjs-command)
    CommandModule,

    // Feature modules — entities registered via TypeOrmModule.forFeature in each module
    HealthModule,
    DatabaseModule,
    UsersModule,
    AuthModule,

    // Register entities needed by SeedCommand (commands module doesn't have its own module)
    TypeOrmModule.forFeature([User]),
  ],

  providers: [
    // Guard order: Throttler → Jwt → Csrf
    // JWT runs first so unauthenticated requests get 401, not 403 CSRF error.
    // CSRF runs after JWT: authenticated mutating requests must supply the csrf header.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },

    // NOTE: ClassSerializerInterceptor removed — manual plainToInstance used per spec
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },

    { provide: APP_FILTER, useClass: AllExceptionsFilter },

    // Seed commands
    SeedCommand,
  ],
})
export class AppModule {}
