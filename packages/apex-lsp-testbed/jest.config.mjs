/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
export default {
  preset: 'ts-jest/presets/js-with-ts-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],

  // Exclude test-artifacts directory which contains cloned repositories
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/test-artifacts/',
  ],

  // Module name mapper to support ESM imports
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    vscode: '<rootDir>/test/__mocks__/vscode.js',
  },
};
