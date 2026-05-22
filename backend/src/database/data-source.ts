import 'reflect-metadata';
import { DataSource } from 'typeorm';

/**
 * TypeORM CLI data source — used by migration:* scripts.
 *
 * Migration workflow:
 *   1. Every schema change → `make be-migrate-gen name=<descriptor>`
 *   2. Review generated SQL in src/database/migrations/
 *   3. Apply → `make be-migrate`
 *   4. Rollback → `make be-migrate-revert`
 *
 * synchronize: true is FORBIDDEN per project conventions.
 */
export const appDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
  // .env.backend uses DB_USER / DB_NAME
  username: process.env.DB_USER ?? '',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? '',
  synchronize: false,
  migrationsRun: false,
  logging: ['error', 'warn'],
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',
});

// Named export for backward compat used by some NestJS factories
export const AppDataSource = appDataSource;

export default appDataSource;
