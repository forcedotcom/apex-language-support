/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Escape a symbol name for safe embedding in a RegExp. Apex identifiers are
 * `[A-Za-z0-9_]`, so in practice nothing needs escaping — but the target may
 * arrive as a qualified/leaf string, and defending against metacharacters
 * keeps the prefilter from throwing on unexpected input.
 */
export const escapeForRegExp = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Word-boundary test for a symbol name inside a file's text. `\b` around the
 * escaped name avoids matching substrings (`geocode` must not match inside
 * `geocodeAddresses`), matching how the parser tokenizes identifiers.
 *
 * Case-insensitive (`i` flag): Apex identifiers are case-insensitive, so a
 * reference to `myField` must surface a file even when the target declares
 * `MyField`. This prefilter is phase 1 of occurrence discovery; phase 2
 * (`findOccurrencesInFile`, in `src/symbols/ops/findOccurrencesInFile.ts`)
 * already case-folds, so a case-sensitive prefilter here would silently drop
 * candidate files before phase 2 could match them — for rename that means
 * occurrences left unrenamed with no error.
 *
 * Best effort: a bad pattern degrades to "no textual match" rather than
 * throwing.
 */
export const textMentionsSymbol = (content: string, name: string): boolean => {
  try {
    return new RegExp(`\\b${escapeForRegExp(name)}\\b`, 'i').test(content);
  } catch {
    return false;
  }
};
