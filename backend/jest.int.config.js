/** @type {import('ts-jest').JestConfigWithTsJest} */
// Integration tests run against mysql_test (port 3307).
// Always run serially (--runInBand) to avoid transaction conflicts.
// Requires NODE_ENV=test so test-data-source.ts is used.
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: ['**/*.int-spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.int-spec.ts',
    '!src/**/index.ts',
    '!src/main.ts',
    '!src/console.ts',
    '!src/**/*.module.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.entity.ts',
    '!src/database/migrations/**',
  ],
  coverageDirectory: 'coverage-integration',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  // Run serially — integration tests share a DB and must not run concurrently
  runInBand: true,
  testTimeout: 30000,
};
