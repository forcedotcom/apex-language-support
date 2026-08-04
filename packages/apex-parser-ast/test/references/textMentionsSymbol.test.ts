/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  escapeForRegExp,
  textMentionsSymbol,
} from '../../src/symbols/ops/textMentionsSymbol';

describe('textMentionsSymbol (find-occurrences phase-1 lexical prefilter)', () => {
  describe('case-insensitivity (Apex identifiers are case-insensitive)', () => {
    it('matches when the reference casing differs from the target casing', () => {
      // Target declared MyField; caller references myField / MYFIELD.
      expect(textMentionsSymbol('return myField;', 'MyField')).toBe(true);
      expect(textMentionsSymbol('return MYFIELD;', 'MyField')).toBe(true);
      expect(textMentionsSymbol('return MyField;', 'myfield')).toBe(true);
    });

    it('matches an exact-case occurrence too (regression guard)', () => {
      expect(textMentionsSymbol('return MyField;', 'MyField')).toBe(true);
    });

    it('surfaces a differently-cased method call site', () => {
      const content = 'Object c = GeocodingService.geocodeaddresses(x);';
      expect(textMentionsSymbol(content, 'geocodeAddresses')).toBe(true);
    });
  });

  describe('word boundaries (must not match substrings)', () => {
    it('does not match a name embedded in a longer identifier', () => {
      expect(textMentionsSymbol('geocodeAddresses(x);', 'geocode')).toBe(false);
    });

    it('does not match a name as a suffix of a longer identifier', () => {
      expect(textMentionsSymbol('myFieldValue = 1;', 'Value')).toBe(false);
    });

    it('matches a whole-word occurrence adjacent to punctuation', () => {
      expect(textMentionsSymbol('this.greet();', 'greet')).toBe(true);
    });
  });

  describe('regex-metacharacter safety', () => {
    it('treats a metacharacter literally rather than as regex syntax', () => {
      // `.` must match a literal dot, not "any character": a name of `a.b`
      // must NOT match `axb`, but must match `a.b`.
      expect(textMentionsSymbol('axb here', 'a.b')).toBe(false);
      expect(textMentionsSymbol('a.b here', 'a.b')).toBe(true);
    });

    it('does not throw on a name of pure metacharacters', () => {
      expect(() => textMentionsSymbol('content', '(*)')).not.toThrow();
    });
  });

  describe('degenerate input', () => {
    it('returns false for empty content', () => {
      expect(textMentionsSymbol('', 'MyField')).toBe(false);
    });
  });

  describe('escapeForRegExp', () => {
    it('escapes regex metacharacters', () => {
      expect(escapeForRegExp('a.b*c')).toBe('a\\.b\\*c');
    });

    it('leaves plain Apex identifiers untouched', () => {
      expect(escapeForRegExp('MyField_1')).toBe('MyField_1');
    });
  });
});
