const baseConfig = require('../../jest.config.cjs');

module.exports = {
  ...baseConfig,

  // Shared module name mappings
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
    '^@salesforce/apex-ls$': '<rootDir>/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^(\\.{1,2}/.*)\\.worker\\.ts$': '<rootDir>/test/__mocks__/worker.mock.ts',
    '^(\\.{1,2}/.*)\\.worker-esm\\.ts$':
      '<rootDir>/test/__mocks__/worker.mock.ts',
  },

  // Common test patterns
  testMatch: ['**/test/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  rootDir: '.',

  // Transform configuration
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },

  // Coverage
  collectCoverage: false,
};
