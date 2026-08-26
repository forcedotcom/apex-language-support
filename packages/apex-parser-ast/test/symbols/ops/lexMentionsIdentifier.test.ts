/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { lexMentionsIdentifier } from '../../../src/symbols/ops/lexMentionsIdentifier';

describe('lexMentionsIdentifier', () => {
  it('matches an identifier token', () => {
    expect(
      lexMentionsIdentifier('public class C { Integer total; }', 'total'),
    ).toBe(true);
  });

  it('is case-insensitive (Apex identifiers are case-insensitive)', () => {
    expect(
      lexMentionsIdentifier('public class C { Integer Total; }', 'total'),
    ).toBe(true);
  });

  it('returns false when the identifier is absent', () => {
    expect(
      lexMentionsIdentifier('public class C { Integer amount; }', 'total'),
    ).toBe(false);
  });

  it('does NOT match the name inside a string literal', () => {
    expect(
      lexMentionsIdentifier("public class C { String s = 'total'; }", 'total'),
    ).toBe(false);
  });

  it('does NOT match the name inside a comment', () => {
    expect(
      lexMentionsIdentifier(
        'public class C { /* rename total here */ Integer x; }',
        'total',
      ),
    ).toBe(false);
  });

  it('matches even when the source has SYNTAX errors (lexes independent of parse)', () => {
    // `total = ;` is a parse error, but the lexer still emits the `total` token.
    // This is the case that matters for renameField's broken-candidate guard.
    expect(
      lexMentionsIdentifier(
        'public class C { void f() { total = ; } }',
        'total',
      ),
    ).toBe(true);
  });
});
