/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CommonTokenStream } from 'antlr4';
import { ApexParserFactory } from '@apexdevtools/apex-parser';

/**
 * Lexer-based test for whether an Apex identifier appears as a TOKEN in source
 * text. Unlike a raw-text regex, this runs the Apex LEXER and matches only
 * genuine tokens, so an identifier that appears solely inside a string literal
 * or a comment does NOT match (those are distinct token kinds whose text is not
 * the bare identifier). Case-insensitive, matching Apex identifier semantics.
 *
 * Purpose (W-23631084 review): renameField scans EVERY stored document (it no
 * longer uses a raw-text prefilter for candidate discovery). The phase-2 guard
 * that declines the whole rename when a candidate fails to parse cleanly would
 * then be tripped by ANY unparseable file in the workspace — even one that does
 * not reference the field — making every field rename fail workspace-wide. This
 * NARROWS that guard: a field reference always emits an identifier token equal
 * to the field name, so a broken file whose token stream lacks that identifier
 * provably cannot reference the field and must not force a decline. This is
 * parser-owned (lexer output), not a raw-text heuristic, and is a SOUND superset
 * for the decline — a false positive (token present but no real reference) only
 * over-declines; it can never drop a genuine reference.
 *
 * Best effort: if lexing throws, returns `true` (conservative — treat as a
 * possible mention so the caller keeps its fail-closed decline).
 */
export const lexMentionsIdentifier = (
  content: string,
  name: string,
): boolean => {
  try {
    const lexer = ApexParserFactory.createLexer(content);
    lexer.removeErrorListeners();
    const stream = new CommonTokenStream(lexer);
    stream.fill();
    const target = name.toLowerCase();
    return stream.tokens.some(
      (t) => t.text != null && t.text.toLowerCase() === target,
    );
  } catch {
    return true;
  }
};
