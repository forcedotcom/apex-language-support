/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

const baseConfig = require('../../jest.config.cjs');

module.exports = {
  ...baseConfig,
  testMatch: [
    '**/test/**/*.test.ts',
    '**/test/**/generate-Standard-Apex-Library.ts',
  ],
  // The shared config also transforms JavaScript for packages that consume ESM
  // dependencies. Parser tests load compiled workspace packages during teardown;
  // sending that entire JavaScript graph through ts-jest can exhaust the worker
  // heap. Only TypeScript sources need transformation in this package.
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  // Bundling and Wireit caching both produce package.json copies beneath this
  // package root. Exclude generated output from Jest's haste package map.
  modulePathIgnorePatterns: ['<rootDir>/(dist|\\.wireit)/'],
  moduleNameMapper: {
    // Tests now use real embedded archives with disk fallback
    // Map workspace packages to their source files for Jest
    '^@salesforce/apex-lsp-shared$':
      '<rootDir>/../apex-lsp-shared/src/index.ts',
    '^@salesforce/apex-lsp-parser-ast$':
      '<rootDir>/../apex-parser-ast/src/index.ts',
    '^@salesforce/apex-lsp-compliant-services$':
      '<rootDir>/../lsp-compliant-services/src/index.ts',
    '^@salesforce/apex-lsp-custom-services$':
      '<rootDir>/../custom-services/src/index.ts',
    '^@salesforce/apex-ls-node$': '<rootDir>/../apex-ls-node/src/index.ts',
    '^@salesforce/apex-ls-browser$':
      '<rootDir>/../apex-ls-browser/src/index.ts',
    '^@salesforce/apex-lsp-browser-client$':
      '<rootDir>/../apex-lsp-browser-client/src/index.ts',
    '^@salesforce/apex-lsp-testbed$':
      '<rootDir>/../apex-lsp-testbed/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/generated/**', '!**/*.d.ts'],
  automock: false,
  resetMocks: false,
  testTimeout: 120_000, // 2 minutes default timeout for tests
  // Recycle workers after they retain too much heap (stdlib/protobuf loads per suite).
  // Without this, parallel runs can hit SIGSEGV in heavy suites (e.g. ApexSymbolManager.references).
  workerIdleMemoryLimit: '1024MB',
  // Cap parallelism to reduce aggregate memory pressure in CI while keeping some concurrency.
  // Override with JEST_MAX_WORKERS (number or Jest string like "75%") when needed.
  maxWorkers: process.env.JEST_MAX_WORKERS || '25%',
  // Parser suites own the scheduler/manager instances inside their isolated test
  // environments. Loading the shared teardown here creates a second copy of the
  // parser and services barrels in Jest's teardown environment; it cannot clean
  // the instances from the test environments and needlessly starts their module
  // graphs during shutdown.
  globalTeardown: undefined,
  // Enable open handle detection when DETECT_OPEN_HANDLES env var is set to 'true'
  // This can be very verbose, so it's opt-in for debugging purposes
  detectOpenHandles: process.env.DETECT_OPEN_HANDLES === 'true',
  // Parser tests must release the resources they create. Keeping this false
  // makes leaked handles visible instead of masking them with Jest's force-exit.
  forceExit: false,
};
