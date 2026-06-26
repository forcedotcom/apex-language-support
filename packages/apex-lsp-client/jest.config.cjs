/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

const baseConfig = require('../../jest.config.cjs');

module.exports = {
  ...baseConfig,
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    // `<rootDir>` is this package dir when jest runs from the package, so the
    // workspace mappings inherited from the root config (which assume the repo
    // root) must be re-pointed at the sibling package source.
    '^@salesforce/apex-lsp-shared$':
      '<rootDir>/../apex-lsp-shared/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  globalTeardown: '<rootDir>/../../scripts/jest-teardown.js',
  collectCoverageFrom: ['src/**/*.ts', '!**/*.d.ts'],
};
