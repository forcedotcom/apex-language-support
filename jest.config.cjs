/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

const { createRequire } = require('module');
const path = require('path');

// Load tsconfig for reference, may be needed later
require(path.resolve(__dirname, 'tsconfig.json'));

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  rootDir: '.',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    // Mock ZIP file imports for Jest (esbuild handles these at bundle time)
    '\\.zip$': '<rootDir>/packages/apex-parser-ast/test/__mocks__/zipMock.js',
    '^@salesforce/apex-lsp-shared$':
      '<rootDir>/packages/apex-lsp-shared/src/index.ts',
    '^@salesforce/apex-lsp-parser-ast$':
      '<rootDir>/packages/apex-parser-ast/src/index.ts',
    '^@salesforce/apex-lsp-compliant-services$':
      '<rootDir>/packages/lsp-compliant-services/src/index.ts',
    '^@salesforce/apex-lsp-custom-services$':
      '<rootDir>/packages/custom-services/src/index.ts',
    '^@salesforce/apex-ls$':
      '<rootDir>/packages/apex-ls/src/index.ts',
    '^@salesforce/apex-lsp-testbed$':
      '<rootDir>/packages/apex-lsp-testbed/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(\\.pnpm|@apexdevtools|antlr4ts)).+\\.js$',
  ],
  testPathIgnorePatterns: ['/node_modules/'], // Exclude performance tests from regular test runs

  // Coverage configuration
  collectCoverage: false, // Disabled by default, enabled by --coverage flag
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'clover', 'html', 'json'],
  collectCoverageFrom: ['packages/*/src/**/*.ts', '!**/*.d.ts'],
  // Coverage thresholds (can be overridden for specific packages)
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 10,
      lines: 10,
      statements: 10,
    },
  },
  globalTeardown: '<rootDir>/scripts/jest-teardown.js',
};
