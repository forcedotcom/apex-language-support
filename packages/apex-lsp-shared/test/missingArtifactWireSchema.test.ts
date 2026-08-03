/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Schema } from 'effect';
import { WireIdentifierSpecSchema } from '../src/wireSchemas';

describe('missing-artifact identifier wire provenance', () => {
  const provenance = {
    sourceUri: 'file:///Example.cls',
    documentVersion: 7,
    referenceRange: {
      startLine: 3,
      startColumn: 4,
      endLine: 3,
      endColumn: 15,
    },
    referenceIdentity: 'ref:Example:3:4:3:15',
    resolvedTypeId: 'type:Example',
    parseCompleteness: 'complete' as const,
  };

  it('preserves semantic provenance across the structured-clone boundary', () => {
    const decoded = Schema.decodeUnknownSync(WireIdentifierSpecSchema)({
      name: 'Example',
      provenance,
    });

    expect(decoded.provenance).toEqual(provenance);
  });

  it('rejects a name-only identifier', () => {
    expect(() =>
      Schema.decodeUnknownSync(WireIdentifierSpecSchema)({ name: 'Example' }),
    ).toThrow();
  });
});
