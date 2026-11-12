/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  hasApexClientCapabilities,
  isApexExtensionApi,
  type ApexClientCapability,
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
    client,
  };

  it('recognizes a supported activation API', () => {
    expect(isApexExtensionApi(api)).toBe(true);
  });

  it('accepts a partial client and ignores version metadata', () => {
    expect(isApexExtensionApi({ client: { hover: client.hover } })).toBe(true);
    expect(isApexExtensionApi({ ...api, apiVersion: 0 })).toBe(true);
  });

  it('rejects a malformed activation API', () => {
    expect(isApexExtensionApi({})).toBe(false);
    expect(isApexExtensionApi({ client: null })).toBe(false);
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
    const partialClient: unknown = { hover: client.hover };
    if (hasApexClientCapabilities(partialClient, ['hover'] as const)) {
      expect(partialClient.hover).toBe(client.hover);
      // @ts-expect-error Only requested literal capabilities are narrowed.
      partialClient.semanticTokens;
    }
    expect(
      hasApexClientCapabilities(partialClient, ['semanticTokens'] as const),
    ).toBe(false);
    expect(hasApexClientCapabilities({}, ['semanticTokens'])).toBe(false);

    const dynamicCapabilities: ApexClientCapability[] = ['hover'];
    const unknownClient: unknown = partialClient;
    if (hasApexClientCapabilities(unknownClient, dynamicCapabilities)) {
      // @ts-expect-error Dynamic capability lists cannot safely narrow methods.
      unknownClient.hover;
    }

    const ambiguousCapabilities: readonly ['hover' | 'completion'] = ['hover'];
    if (hasApexClientCapabilities(unknownClient, ambiguousCapabilities)) {
      // @ts-expect-error Ambiguous capability tuples cannot safely narrow methods.
      unknownClient.hover;
    }

    const unionCapabilities: readonly ['hover'] | readonly ['completion'] =
      Math.random() > 0.5 ? ['hover'] : ['completion'];
    if (hasApexClientCapabilities(unknownClient, unionCapabilities)) {
      // @ts-expect-error Capability tuple unions cannot safely narrow methods.
      unknownClient.hover;
    }
  });
});
