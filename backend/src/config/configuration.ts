export interface AppConfig {
  nodeEnv: string;
  port: number;
  db: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessExpiry: string;
    refreshExpiry: string;
  };
  cookie: {
    secret: string | undefined;
    domain: string;
  };
  corsOrigins: string[];
  swaggerEnabled: boolean;
  logLevel: string;
  defaultLocale: string;
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    // .env.backend uses DB_USER / DB_NAME
    username: process.env.DB_USER ?? '',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? '',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    // .env.backend uses JWT_ACCESS_TTL / JWT_REFRESH_TTL
    accessExpiry: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshExpiry: process.env.JWT_REFRESH_TTL ?? '7d',
  },
  cookie: {
    secret: process.env.COOKIE_SECRET,
    domain: process.env.COOKIE_DOMAIN ?? 'localhost',
  },
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  swaggerEnabled: process.env.SWAGGER_ENABLED === 'true',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  defaultLocale: process.env.DEFAULT_LOCALE ?? 'vi',
});
