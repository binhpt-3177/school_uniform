import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),

  // Database — env file uses DB_USER / DB_NAME (set in .env.backend)
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(3306),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),

  // JWT — env file uses JWT_ACCESS_TTL / JWT_REFRESH_TTL for expiry
  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_ACCESS_TTL: Joi.string().default('15m'),
  JWT_REFRESH_TTL: Joi.string().default('7d'),

  // Cookie
  COOKIE_SECRET: Joi.string().optional(),
  COOKIE_DOMAIN: Joi.string().default('localhost'),

  // CORS
  CORS_ORIGINS: Joi.string().default('http://localhost:5000'),

  // Swagger
  SWAGGER_ENABLED: Joi.string().valid('true', 'false').default('true'),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent')
    .default('info'),

  // i18n
  DEFAULT_LOCALE: Joi.string().default('vi'),
});
