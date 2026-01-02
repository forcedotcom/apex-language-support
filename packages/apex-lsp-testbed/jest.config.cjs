const baseConfig = require('../../jest.config.cjs');

module.exports = {
  ...baseConfig,
  // Include both .test.ts and .perf.ts files for Jest extension recognition
  testMatch: [
    '**/test/**/*.test.ts',
    '**/test/**/*.perf.ts',
  ],
  testPathIgnorePatterns: [
    ...(baseConfig.testPathIgnorePatterns || []),
    '/node_modules/',
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/test-artifacts/',
  ],
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
    '^@salesforce/apex-ls$':
      '<rootDir>/../apex-ls/src/index.ts',
    '^@salesforce/apex-lsp-testbed$': '<rootDir>/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
