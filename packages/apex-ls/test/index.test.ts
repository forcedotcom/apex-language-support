/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { startServer } from '../src/index';

describe('Unified Apex Language Server', () => {
  it('should export startServer function', () => {
    expect(typeof startServer).toBe('function');
  });

  it('should be the default export', () => {
    const defaultExport = require('../src/index').default;
    expect(defaultExport).toBe(startServer);
  });
});
