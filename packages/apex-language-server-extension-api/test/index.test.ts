/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  APEX_EXTENSION_API_VERSION,
  hasApexClientCapabilities,
  isApexExtensionApi,
} from '../src/index';

const client = {
  getLineBreakpointInfo: async () => [],
  getExceptionBreakpointInfo: async () => [],
  getFeatureState: () => ({ supported: false, enabled: false }),
  hover: async () => null,
  completion: async () => null,
  definition: async () => null,
  documentSymbol: async () => [],
  semanticTokens: async () => [],
};

describe('Apex extension API contract', () => {
  const api = {
    apiVersion: APEX_EXTENSION_API_VERSION,
    client,
  };

  it('recognizes a supported activation API', () => {
    expect(isApexExtensionApi(api)).toBe(true);
  });

  it('rejects a malformed or incompatible activation API', () => {
    expect(isApexExtensionApi({ ...api, apiVersion: 0 })).toBe(false);
    expect(isApexExtensionApi({ ...api, client: {} })).toBe(false);
    expect(isApexExtensionApi({ ...api, codeLens: {} })).toBe(false);
  });

  it('reports requested client capabilities', () => {
    expect(
      hasApexClientCapabilities(api.client, [
        'hover',
        'documentSymbol',
        'semanticTokens',
      ]),
    ).toBe(true);
    expect(hasApexClientCapabilities({}, ['semanticTokens'])).toBe(false);
  });
});
