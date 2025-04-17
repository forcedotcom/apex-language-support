/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
// Load tsconfig for reference, may be needed later
require('./tsconfig.json');

export default {
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  rootDir: './',
  roots: ['<rootDir>/packages'],
  transform: {
    '^.+\\.(ts|js)x?$': 'babel-jest',
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
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
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};
