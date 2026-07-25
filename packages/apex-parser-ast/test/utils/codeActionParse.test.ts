/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  findConstantExtractionForCodeAction,
  findExpressionForCodeAction,
  findMethodCallForCodeAction,
  parseForCodeActions,
} from '../../src/utils/codeActionParse';
import { LspRange } from '../../src/utils/expressionRangeFinder';

/**
 * Locate the 0-based line/character of a substring within a source, returning a
 * range covering exactly that substring.
 */
const rangeOf = (source: string, needle: string): LspRange => {
  const lines = source.split('\n');
  for (let line = 0; line < lines.length; line++) {
    const character = lines[line].indexOf(needle);
    if (character !== -1) {
      return {
        start: { line, character },
        end: { line, character: character + needle.length },
      };
    }
  }
  throw new Error(`substring not found in source: ${needle}`);
};

describe('parseForCodeActions', () => {
  const uri = 'file:///test/CodeActionParse.cls';

  it('parses valid source into a usable context for the finders', () => {
    const source = [
      'public class Sample {',
      '  public void run() {',
      '    Integer total = 1 + 2 * 3;',
      '  }',
      '}',
    ].join('\n');

    const context = parseForCodeActions(source, uri);
    expect(context).not.toBeNull();

    const found = findExpressionForCodeAction(
      context,
      rangeOf(source, '2 * 3'),
    );
    expect(found).not.toBeNull();
    // Verbatim source text (whitespace preserved), not the collapsed getText().
    expect(found!.expressionText).toBe('2 * 3');
    // Char span points at the expression's own source offsets.
    expect(source.substring(found!.expressionStart, found!.expressionEnd)).toBe(
      '2 * 3',
    );
  });

  it('returns null on empty source', () => {
    const context = parseForCodeActions('', uri);
    // Empty input yields no usable expression even if a (trivial) tree parses.
    const found = context
      ? findExpressionForCodeAction(context, rangeOf('x', 'x'))
      : null;
    expect(found).toBeNull();
  });

  it('degrades gracefully (never throws) on garbage input', () => {
    const source = 'public class @@@ { void ( { %%% }';
    expect(() => parseForCodeActions(source, uri)).not.toThrow();
    const context = parseForCodeActions(source, uri);
    // No well-formed expression is recoverable from the garbage.
    const found = findExpressionForCodeAction(context, {
      start: { line: 0, character: 20 },
      end: { line: 0, character: 23 },
    });
    expect(found).toBeNull();
  });

  it('null context short-circuits every accessor', () => {
    const range = rangeOf('x', 'x');
    expect(findExpressionForCodeAction(null, range)).toBeNull();
    expect(findConstantExtractionForCodeAction(null, range)).toBeNull();
    expect(findMethodCallForCodeAction(null, range)).toBeNull();
    expect(findExpressionForCodeAction(undefined, range)).toBeNull();
  });

  it('reuses a single parse across all three finders (one context, no reparse)', () => {
    const source = [
      'public class Sample {',
      '  public void run() {',
      "    String greeting = 'hello';",
      '  }',
      '}',
    ].join('\n');

    // Parse once; feed the same context to every accessor.
    const context = parseForCodeActions(source, uri);
    expect(context).not.toBeNull();

    const expr = findExpressionForCodeAction(
      context,
      rangeOf(source, "'hello'"),
    );
    const constant = findConstantExtractionForCodeAction(
      context,
      rangeOf(source, "'hello'"),
    );

    expect(expr).not.toBeNull();
    expect(expr!.expressionText).toBe("'hello'");
    expect(constant).not.toBeNull();
    expect(constant!.isLiteral).toBe(true);
    expect(constant!.isInner).toBe(false);
  });

  it('describes a method call at a range via the shared context', () => {
    const source = [
      'public class Sample {',
      '  public void run() {',
      '    Integer r = compute(42);',
      '  }',
      '}',
    ].join('\n');

    const context = parseForCodeActions(source, uri);
    const call = findMethodCallForCodeAction(
      context,
      rangeOf(source, 'compute'),
    );

    expect(call).not.toBeNull();
    expect(call!.methodName).toBe('compute');
    expect(call!.receiverText).toBeUndefined();
    expect(call!.returnContext).toBe('variable-initializer');
  });
});
