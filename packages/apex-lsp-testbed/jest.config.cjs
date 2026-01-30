const baseConfig = require('../../jest.config.cjs');
const { platform } = require('os');

module.exports = {
  ...baseConfig,
  // Global setup to clean up snapshots on Windows before tests run
  // This prevents obsolete snapshot warnings for skipped tests
  globalSetup:
    platform() === 'win32'
      ? '<rootDir>/scripts/jest-setup-windows.js'
      : baseConfig.globalSetup,
  // Only include .test.ts files for unit tests
  // Performance tests (.perf.ts) are run separately via test:perf command
  // Integration tests are run separately via test:integration command
  testMatch: ['**/test/**/*.test.ts'],
  testPathIgnorePatterns: [
    ...(baseConfig.testPathIgnorePatterns || []),
    '/node_modules/',
    '<rootDir>/test/integration/', // Exclude integration tests from unit test runs
  ],
  modulePathIgnorePatterns: ['<rootDir>/test-artifacts/'],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@salesforce/apex-lsp-shared$':
      '<rootDir>/../apex-lsp-shared/src/index.ts',
    '^@salesforce/apex-lsp-parser-ast$':
      '<rootDir>/../apex-parser-ast/src/index.ts',
    '^@salesforce/apex-lsp-compliant-services$':
      '<rootDir>/../lsp-compliant-services/src/index.ts',
    '^@salesforce/apex-lsp-custom-services$':
      '<rootDir>/../custom-services/src/index.ts',
    '^@salesforce/apex-ls$': '<rootDir>/../apex-ls/src/index.ts',
    '^@salesforce/apex-lsp-testbed$': '<rootDir>/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
