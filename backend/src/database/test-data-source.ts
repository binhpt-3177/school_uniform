import 'reflect-metadata';
import { DataSource } from 'typeorm';

/**
 * TypeORM data source for integration tests.
 * Points at mysql_test (port 3307) via TEST_DB_* env vars.
 * synchronize: true is FORBIDDEN per project conventions.
 */
export const testDataSource = new DataSource({
  type: 'mysql',
  host: process.env.TEST_DB_HOST ?? 'localhost',
  port: parseInt(process.env.TEST_DB_PORT ?? '3307', 10),
  username: process.env.TEST_DB_USER ?? '',
  password: process.env.TEST_DB_PASSWORD ?? '',
  database: process.env.TEST_DB_NAME ?? '',
  synchronize: false,
  migrationsRun: false,
  logging: ['error', 'warn'],
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',
});

export default testDataSource;
