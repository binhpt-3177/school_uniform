import { DataSource } from 'typeorm';

/**
 * Truncate all tables tracked by the given DataSource.
 * Disables FK checks to handle dependent tables in any order.
 * Use in afterEach / afterAll hooks to reset integration test state.
 */
export async function truncateAll(ds: DataSource): Promise<void> {
  await ds.query('SET FOREIGN_KEY_CHECKS = 0');
  const tables = ds.entityMetadatas.map((m) => m.tableName);
  for (const t of tables) await ds.query(`TRUNCATE TABLE \`${t}\``);
  await ds.query('SET FOREIGN_KEY_CHECKS = 1');
}
