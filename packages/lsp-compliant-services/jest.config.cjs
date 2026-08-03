const baseConfig = require('../../jest.config.cjs');

module.exports = {
  ...baseConfig,
  // This package consumes workspace TypeScript sources directly. Transforming
  // compiled JavaScript loaded by global teardown makes focused tests compile
  // the entire output graph again and can exhaust the Jest worker heap.
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
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
  // Service suites own their scheduler and singleton instances inside Jest's
  // isolated test environments. The shared teardown loads fresh parser and
  // services barrels in a separate environment, so it cannot clean the state
  // created by those suites and only adds shutdown work.
  globalTeardown: undefined,
  // Increase test timeout to allow cleanup of setTimeout-based monitoring tasks
  testTimeout: 120_000,
  // Recycle workers after they retain too much heap (stdlib/protobuf loads per suite).
  // Without this, parallel runs can hit OOM in heavy integration suites (e.g. HoverProcessingService).
  workerIdleMemoryLimit: '512MB',
  // maxWorkers: 1 ensures each test file completes before the next starts, giving workerIdleMemoryLimit
  // a chance to recycle the worker and free accumulated heap between suites on Node 20.x.
  // Override with JEST_MAX_WORKERS (number or Jest string like "50%") when needed.
  maxWorkers: process.env.JEST_MAX_WORKERS || 1,
  // Enable open handle detection when DETECT_OPEN_HANDLES env var is set to 'true'
  // This can be very verbose, so it's opt-in for debugging purposes
  detectOpenHandles: process.env.DETECT_OPEN_HANDLES === 'true',
  // Service tests must release the resources they create. Keeping this false
  // makes leaked handles visible instead of masking them with Jest's force-exit.
  forceExit: false,
};
