/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  findExpressionForCodeAction,
  inferTypeForCodeAction,
  parseForCodeActions,
} from '../../src/utils/codeActionParse';
import { LspRange } from '../../src/utils/expressionRangeFinder';

/**
 * Range covering exactly the first occurrence of `needle` in `source`
 * (0-based line/character).
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

/**
 * Range covering the LAST occurrence of `needle` in `source` — used to target a
 * variable/parameter *reference* rather than its earlier declaration, which
 * shares the same identifier text.
 */
const lastRangeOf = (source: string, needle: string): LspRange => {
  const idx = source.lastIndexOf(needle);
  if (idx === -1) {
    throw new Error(`substring not found in source: ${needle}`);
  }
  const before = source.substring(0, idx);
  const line = before.split('\n').length - 1;
  const character = idx - (before.lastIndexOf('\n') + 1);
  return {
    start: { line, character },
    end: { line, character: character + needle.length },
  };
};

/**
 * Parse `source`, locate the expression at `needle`, and infer its type — the
 * exact path the Extract code actions take. Targets the first occurrence of
 * `needle`; pass `range` explicitly for reference-vs-declaration disambiguation.
 */
const inferAt = (
  source: string,
  needle: string,
  range: LspRange = rangeOf(source, needle),
): string | null => {
  const uri = 'file:///test/ExprTypeInfer.cls';
  const context = parseForCodeActions(source, uri);
  const found = findExpressionForCodeAction(context, range);
  return inferTypeForCodeAction(context, found);
};

const inMethod = (body: string): string =>
  [
    'public class Sample {',
    '  public void run() {',
    `    ${body}`,
    '  }',
    '}',
  ].join('\n');

describe('inferTypeForCodeAction — literals', () => {
  it('infers String for a string literal', () => {
    expect(inferAt(inMethod("String s = 'hello';"), "'hello'")).toBe('String');
  });

  it('infers Integer for an integer literal', () => {
    expect(inferAt(inMethod('Integer i = 42;'), '42')).toBe('Integer');
  });

  it('infers Long for a long literal', () => {
    expect(inferAt(inMethod('Long n = 42L;'), '42L')).toBe('Long');
  });

  it('infers Decimal for a number literal', () => {
    expect(inferAt(inMethod('Decimal d = 3.14;'), '3.14')).toBe('Decimal');
  });

  it('infers Boolean for a boolean literal', () => {
    expect(inferAt(inMethod('Boolean b = true;'), 'true')).toBe('Boolean');
  });
});

describe('inferTypeForCodeAction — composite expressions', () => {
  it('promotes Integer * Integer to Integer', () => {
    expect(inferAt(inMethod('Integer x = 2 * 3;'), '2 * 3')).toBe('Integer');
  });

  it('promotes Integer + Decimal to Decimal', () => {
    expect(inferAt(inMethod('Decimal x = 1 + 2.0;'), '1 + 2.0')).toBe(
      'Decimal',
    );
  });

  it('treats String + Integer as String concatenation', () => {
    expect(inferAt(inMethod("String x = 'n=' + 1;"), "'n=' + 1")).toBe(
      'String',
    );
  });

  it('resolves a comparison to Boolean', () => {
    expect(inferAt(inMethod('Boolean b = 1 < 2;'), '1 < 2')).toBe('Boolean');
  });

  it('preserves the numeric type through parentheses', () => {
    expect(inferAt(inMethod('Integer x = (2 + 3);'), '(2 + 3)')).toBe(
      'Integer',
    );
  });
});

describe('inferTypeForCodeAction — new and cast', () => {
  it('infers the constructed type for a new expression, casing preserved', () => {
    expect(
      inferAt(inMethod('Account a = new Account();'), 'new Account()'),
    ).toBe('Account');
  });

  it('infers the target type for a cast, casing preserved', () => {
    expect(
      inferAt(
        inMethod('Object raw = null; String s = (String) raw;'),
        '(String) raw',
      ),
    ).toBe('String');
  });
});

describe('inferTypeForCodeAction — same-file variable references', () => {
  it('infers a local variable declared type, casing preserved', () => {
    const source = inMethod(
      'String greeting = null;\n    String other = greeting;',
    );
    // Target the reference (last `greeting`), not the earlier declaration.
    expect(inferAt(source, 'greeting', lastRangeOf(source, 'greeting'))).toBe(
      'String',
    );
  });

  it('infers a parameter declared type', () => {
    const source = [
      'public class Sample {',
      '  public void run(Account input) {',
      '    Account local = input;',
      '  }',
      '}',
    ].join('\n');
    // Target the reference (last `input`), not the parameter declaration.
    expect(inferAt(source, 'input', lastRangeOf(source, 'input'))).toBe(
      'Account',
    );
  });
});

describe('inferTypeForCodeAction — same-file method-call return types', () => {
  it('infers an unqualified method-call return type, casing preserved', () => {
    const source = [
      'public class Sample {',
      '  public void run() {',
      '    Account a = makeAccount();',
      '  }',
      '  private Account makeAccount() {',
      '    return new Account();',
      '  }',
      '}',
    ].join('\n');
    expect(inferAt(source, 'makeAccount()')).toBe('Account');
  });
});

describe('inferTypeForCodeAction — graceful degradation', () => {
  it('returns null for a null context', () => {
    expect(inferTypeForCodeAction(null, null)).toBeNull();
  });

  it('returns null when the type cannot be resolved (falls back to Object at the caller)', () => {
    // A qualified/chained access is deferred to the cross-file seam (absent
    // here) and yields null.
    const source = inMethod('Object x = a.b.c;');
    expect(inferAt(source, 'a.b.c')).toBeNull();
  });

  it('never throws on garbage input', () => {
    const source = 'public class @@@ { void ( { %%% }';
    expect(() => parseForCodeActions(source, 'file:///g.cls')).not.toThrow();
  });
});

describe('inferTypeForCodeAction — cross-file seam', () => {
  it('routes unresolved method names through the injected lookup', () => {
    const uri = 'file:///test/Seam.cls';
    const source = inMethod('Object x = external();');
    const context = parseForCodeActions(source, uri);
    const found = findExpressionForCodeAction(
      context,
      rangeOf(source, 'external()'),
    );
    const inferred = inferTypeForCodeAction(context, found, {
      lookupCrossFileType: (name) => (name === 'external' ? 'MyResult' : null),
    });
    expect(inferred).toBe('MyResult');
  });
});
