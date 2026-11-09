/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as Schema from 'effect/Schema';
import {
  ApexExtensionApiSchema,
  APEX_EXTENSION_API_VERSION,
} from '../src/effect';

describe('Effect Apex extension API schema', () => {
  it('accepts the same activation API shape as the standard guard', () => {
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

    expect(
      Schema.decodeUnknownSync(ApexExtensionApiSchema)({
        apiVersion: APEX_EXTENSION_API_VERSION,
        client,
      }),
    ).toEqual({ apiVersion: APEX_EXTENSION_API_VERSION, client });
  });

  it('rejects an incompatible activation API version', () => {
    expect(() =>
      Schema.decodeUnknownSync(ApexExtensionApiSchema)({
        apiVersion: 0,
        client: {},
      }),
    ).toThrow();
  });
});
