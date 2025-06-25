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
  collectCoverageFrom: [
    'src/**/*.ts',
    '!**/out/**',
    '!**/test/**',
    '!**/*.d.ts',
    '!**/index.ts',
  ],
};
