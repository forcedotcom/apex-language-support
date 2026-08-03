/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { resolveArgumentSemantics } from '../../src/utils/argumentTypeResolution';

describe('resolveArgumentSemantics', () => {
  const lookup = (id: string): string | undefined =>
    ({ name: 'String', count: 'Integer' })[id];

  it('uses parser-classified literal types without consulting symbol lookup', () => {
    let consulted = false;
    expect(
      resolveArgumentSemantics(
        [{ kind: 'literal', literalType: 'String' }],
        () => {
          consulted = true;
          return undefined;
        },
      ),
    ).toEqual(['String']);
    expect(consulted).toBe(false);
  });

  it('resolves parser-classified identifiers through lexical scope', () => {
    expect(
      resolveArgumentSemantics(
        [
          { kind: 'identifier', name: 'name' },
          { kind: 'identifier', name: 'count' },
        ],
        lookup,
      ),
    ).toEqual(['String', 'Integer']);
  });

  it('returns an empty signature for a no-argument call', () => {
    expect(resolveArgumentSemantics([], lookup)).toEqual([]);
  });

  it('preserves uncertainty for unresolved roots or identifiers', () => {
    expect(
      resolveArgumentSemantics([{ kind: 'unresolved' }], lookup),
    ).toBeUndefined();
    expect(
      resolveArgumentSemantics(
        [{ kind: 'identifier', name: 'missing' }],
        lookup,
      ),
    ).toBeUndefined();
  });
});
