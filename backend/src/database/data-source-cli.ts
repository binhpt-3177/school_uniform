import 'reflect-metadata';
import { DataSource } from 'typeorm';

/**
 * Single-export DataSource for TypeORM CLI (migration:generate, migration:run, etc).
 * TypeORM CLI requires exactly one DataSource export per file.
 */
const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
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

export default dataSource;
