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
 * `geocodeAddresses`), matching how the parser tokenizes identifiers. Best
 * effort: a bad pattern degrades to "no textual match" rather than throwing.
 */
export const textMentionsSymbol = (content: string, name: string): boolean => {
  try {
    return new RegExp(`\\b${escapeForRegExp(name)}\\b`).test(content);
  } catch {
    return false;
  }
};
