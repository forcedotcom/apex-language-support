/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DEFAULT_SERVICE_CONFIG } from '../../src/config/ServiceConfiguration';

describe('DEFAULT_SERVICE_CONFIG', () => {
  it('gives distributed completion the progressive handler budget', () => {
    const completion = DEFAULT_SERVICE_CONFIG.find(
      ({ requestType }) => requestType === 'completion',
    );

    expect(completion?.timeout).toBe(2000);
  });

  it('gives distributed definition processing enough time to complete', () => {
    const definition = DEFAULT_SERVICE_CONFIG.find(
      ({ requestType }) => requestType === 'definition',
    );

    expect(definition?.timeout).toBe(5000);
  });
});
