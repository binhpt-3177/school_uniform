import { testDataSource } from '../../src/database/test-data-source';
import { DataSource } from 'typeorm';

export { testDataSource };

/**
 * Initialize the test data source if not already connected.
 * Safe to call multiple times — no-op if already initialized.
 */
export async function initTestDataSource(): Promise<DataSource> {
  if (!testDataSource.isInitialized) {
    await testDataSource.initialize();
  }
  return testDataSource;
}
