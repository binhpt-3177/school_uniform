/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testMatch: ['**/*.spec.ts'],
  testPathIgnorePatterns: ['int-spec'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  // rootDir is src, so paths here are relative to src/
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.spec.ts',
    '!**/*.int-spec.ts',
    '!**/index.ts',
    '!main.ts',
    '!console.ts',
    '!**/*.module.ts',
    '!**/*.dto.ts',
    '!**/*.entity.ts',
    '!database/migrations/**',
    // Infrastructure / CLI files: not meaningful to unit-test
    '!database/data-source.ts',
    '!database/data-source-cli.ts',
    '!database/test-data-source.ts',
    '!commands/seed.command.ts',
    // Config factory: only env var reads, no branching logic worth unit-testing
    '!config/configuration.ts',
    '!config/env-validation.schema.ts',
    // Controllers are covered by integration tests (not unit tests)
    '!**/*.controller.ts',
    // JWT guard and CurrentUser decorator are covered by integration tests
    '!common/guards/jwt-auth.guard.ts',
    '!common/decorators/current-user.decorator.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
