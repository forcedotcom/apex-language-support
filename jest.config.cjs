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
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  rootDir: './',
  roots: ['<rootDir>/packages'],
  transform: {
    '^.+\\.(ts|js)x?$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          '@babel/preset-typescript',
        ],
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@salesforce/apex-lsp-parser-ast$':
      '<rootDir>/packages/apex-parser-ast/src',
    '^@salesforce/apex-lsp-compliant-services$':
      '<rootDir>/packages/lsp-compliant-services/src',
    '^@salesforce/apex-lsp-testbed$': '<rootDir>/packages/apex-lsp-testbed/src',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(\\.pnpm|@apexdevtools|antlr4ts)).+\\.js$',
  ],

  // Coverage configuration
  collectCoverage: false, // Disabled by default, enabled by --coverage flag
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'clover', 'html', 'json'],
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/test/**',
    '!**/*.d.ts',
    '!**/index.ts',
  ],
  // Coverage thresholds (can be overridden for specific packages)
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 10,
      lines: 10,
      statements: 10,
    },
  },
};
