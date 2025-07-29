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
    // Override the base config to remove apex-lsp-shared mapping
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
    // Mock apex-lsp-shared
    '^@salesforce/apex-lsp-shared$':
      '<rootDir>/test/__mocks__/@salesforce/apex-lsp-shared.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/generated/**', '!**/*.d.ts'],
  automock: false,
  resetMocks: false,
};
