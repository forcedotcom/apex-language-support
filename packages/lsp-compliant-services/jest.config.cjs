const baseConfig = require('../../jest.config.cjs');

module.exports = {
  ...baseConfig,
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    // Mock ZIP file imports for Jest (esbuild handles these at bundle time)
    '\\.zip$': '<rootDir>/../apex-parser-ast/test/__mocks__/zipMock.js',
    '^@salesforce/apex-lsp-shared$':
      '<rootDir>/../apex-lsp-shared/src/index.ts',
    '^@salesforce/apex-lsp-parser-ast$':
      '<rootDir>/../apex-parser-ast/src/index.ts',
    '^@salesforce/apex-lsp-compliant-services$': '<rootDir>/src/index.ts',
    '^@salesforce/apex-lsp-custom-services$':
      '<rootDir>/../custom-services/src/index.ts',
    '^@salesforce/apex-ls$': '<rootDir>/../apex-ls/src/index.ts',
    '^@salesforce/apex-lsp-testbed$':
      '<rootDir>/../apex-lsp-testbed/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  globalTeardown: '<rootDir>/../../scripts/jest-teardown.js',
  // Increase test timeout to allow cleanup of setTimeout-based monitoring tasks
  testTimeout: 30000,
  // Enable open handle detection when DETECT_OPEN_HANDLES env var is set to 'true'
  // This can be very verbose, so it's opt-in for debugging purposes
  detectOpenHandles: process.env.DETECT_OPEN_HANDLES === 'true',
};
