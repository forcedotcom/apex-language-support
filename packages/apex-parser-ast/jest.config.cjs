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
  moduleNameMapper: {
    // Mock ZIP file imports for Jest (esbuild handles these at bundle time)
    '\\.zip$': '<rootDir>/test/__mocks__/zipMock.js',
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
  testTimeout:  120_000, // 2 minutes default timeout for tests
  globalTeardown: '<rootDir>/../../scripts/jest-teardown.js',
  // Enable open handle detection when DETECT_OPEN_HANDLES env var is set to 'true'
  // This can be very verbose, so it's opt-in for debugging purposes
  detectOpenHandles: process.env.DETECT_OPEN_HANDLES === 'true',
  // Force exit after tests complete to prevent hanging on open handles
  // NOTE: This is a workaround - the warning will still appear, allowing us to track the issue
  // The warning appears before forceExit takes effect, so we don't lose visibility
  // Can be disabled with JEST_FORCE_EXIT=false if needed for debugging
  forceExit: process.env.JEST_FORCE_EXIT !== 'false', // Default to true, can disable with JEST_FORCE_EXIT=false
};
