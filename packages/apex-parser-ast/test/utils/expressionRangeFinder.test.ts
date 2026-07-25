/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import {
  findConstantExtraction,
  findExpressionAtRange,
  LspRange,
} from '../../src/utils/expressionRangeFinder';

/**
 * Build an LSP range (0-based line/character) from convenient literals.
 */
const range = (
  startLine: number,
  startChar: number,
  endLine: number,
  endChar: number,
): LspRange => ({
  start: { line: startLine, character: startChar },
  end: { line: endLine, character: endChar },
});

/**
 * Locate the 0-based line/character of a substring within a source, returning a
 * range covering exactly that substring. Keeps the tests readable and robust to
 * whitespace changes.
 */
const rangeOf = (source: string, needle: string): LspRange => {
  const lines = source.split('\n');
  for (let line = 0; line < lines.length; line++) {
    const character = lines[line].indexOf(needle);
    if (character !== -1) {
      return range(line, character, line, character + needle.length);
    }
  }
  throw new Error(`substring not found in source: ${needle}`);
};

describe('findExpressionAtRange', () => {
  let compilerService: CompilerService;

  beforeEach(() => {
    compilerService = new CompilerService();
  });

  const compile = (source: string, fileName = 'Finder.cls') => {
    const listener = new ApexSymbolCollectorListener(undefined, 'full');
    return compilerService.compile(source, fileName, listener);
  };

  it('finds the minimal expression for a single-expression selection (happy path)', () => {
    const source = [
      'public class Finder {',
      '  public void run() {',
      '    Integer total = 1 + 2 * 3;',
      '  }',
      '}',
    ].join('\n');

    const result = compile(source);
    const finding = findExpressionAtRange(
      result.parseTree,
      rangeOf(source, '2 * 3'),
    );

    expect(finding).not.toBeNull();
    expect(finding!.expression.getText()).toBe('2*3');
  });

  it('selects the tightest enclosing expression when the whole RHS is selected', () => {
    const source = [
      'public class Finder {',
      '  public void run() {',
      '    Integer total = 1 + 2 * 3;',
      '  }',
      '}',
    ].join('\n');

    const result = compile(source);
    const finding = findExpressionAtRange(
      result.parseTree,
      rangeOf(source, '1 + 2 * 3'),
    );

    expect(finding).not.toBeNull();
    expect(finding!.expression.getText()).toBe('1+2*3');
  });

  it('reports the enclosing statement start offset and its indentation', () => {
    const source = [
      'public class Finder {',
      '  public void run() {',
      '    Integer total = 1 + 2 * 3;',
      '  }',
      '}',
    ].join('\n');

    const result = compile(source);
    const finding = findExpressionAtRange(
      result.parseTree,
      rangeOf(source, '2 * 3'),
    );

    expect(finding).not.toBeNull();
    // Statement is indented four spaces inside the method body.
    expect(finding!.indent).toBe('    ');
    // Offset points at the first character ('I' of "Integer") of the statement.
    const charAtStart = source.charAt(finding!.statementStart);
    expect(charAtStart).toBe('I');
  });

  it('reports the expression char span and verbatim text', () => {
    const source = [
      'public class Finder {',
      '  public void run() {',
      '    Integer total = 1 + 2 * 3;',
      '  }',
      '}',
    ].join('\n');

    const result = compile(source);
    const finding = findExpressionAtRange(
      result.parseTree,
      rangeOf(source, '2 * 3'),
    );

    expect(finding).not.toBeNull();
    // The char span points at the expression's own source offsets, and the
    // verbatim text preserves the author's whitespace (unlike getText()).
    expect(
      source.substring(finding!.expressionStart, finding!.expressionEnd),
    ).toBe('2 * 3');
    expect(finding!.expressionText).toBe('2 * 3');
  });

  it('preserves tab indentation', () => {
    const source = [
      'public class Finder {',
      '\tpublic void run() {',
      '\t\tInteger total = 1 + 2;',
      '\t}',
      '}',
    ].join('\n');

    const result = compile(source);
    const finding = findExpressionAtRange(
      result.parseTree,
      rangeOf(source, '1 + 2'),
    );

    expect(finding).not.toBeNull();
    expect(finding!.indent).toBe('\t\t');
  });

  it('returns null when the selection spans multiple statements', () => {
    const source = [
      'public class Finder {',
      '  public void run() {',
      '    doA();',
      '    doB();',
      '  }',
      '}',
    ].join('\n');

    const result = compile(source);
    // Range from the start of doA() through the end of doB().
    const multi = range(2, 4, 3, 10);
    const finding = findExpressionAtRange(result.parseTree, multi);

    expect(finding).toBeNull();
  });

  it('returns null when the selection is not an expression (whitespace/gap)', () => {
    const source = [
      'public class Finder {',
      '  public void run() {',
      '    Integer x = 1;',
      '  }',
      '}',
    ].join('\n');

    const result = compile(source);
    // A collapsed selection on the blank line before the closing brace.
    const empty = range(3, 0, 3, 0);
    const finding = findExpressionAtRange(result.parseTree, empty);

    expect(finding).toBeNull();
  });

  it('returns null for an expression not inside a method/block body (field initializer)', () => {
    const source = [
      'public class Finder {',
      '  private Integer field = 1 + 2;',
      '}',
    ].join('\n');

    const result = compile(source);
    const finding = findExpressionAtRange(
      result.parseTree,
      rangeOf(source, '1 + 2'),
    );

    expect(finding).toBeNull();
  });

  it('degrades to null (never throws) on syntactically broken input', () => {
    const source = [
      'public class Finder {',
      '  public void run() {',
      '    Integer total = 1 + ;', // syntax error: missing operand
      '  }',
      // missing closing braces
    ].join('\n');

    const result = compile(source);

    expect(() =>
      findExpressionAtRange(result.parseTree, rangeOf(source, '1 +')),
    ).not.toThrow();
  });

  it('returns null when the parse tree is missing', () => {
    expect(findExpressionAtRange(undefined, range(0, 0, 0, 0))).toBeNull();
    expect(findExpressionAtRange(null, range(0, 0, 0, 0))).toBeNull();
  });
});

describe('findConstantExtraction', () => {
  let compilerService: CompilerService;

  beforeEach(() => {
    compilerService = new CompilerService();
  });

  const compile = (source: string, fileName = 'Const.cls') => {
    const listener = new ApexSymbolCollectorListener(undefined, 'full');
    return compilerService.compile(source, fileName, listener);
  };

  /** Resolve the expression at `needle`, then its constant-extraction descriptor. */
  const extractionFor = (source: string, needle: string) => {
    const result = compile(source);
    const found = findExpressionAtRange(
      result.parseTree,
      rangeOf(source, needle),
    );
    expect(found).not.toBeNull();
    return findConstantExtraction(found!.expression);
  };

  it('uses the class line indent + one unit for a top-level `public class`', () => {
    const source = [
      'public class Const {',
      '  public void run() {',
      "    String greeting = 'hello';",
      '  }',
      '}',
    ].join('\n');

    const extraction = extractionFor(source, "'hello'");

    expect(extraction).not.toBeNull();
    // Top-level class sits at column 0, so members indent one unit (two spaces).
    expect(extraction!.indent).toBe('  ');
    expect(extraction!.isInner).toBe(false);
    expect(extraction!.isLiteral).toBe(true);
  });

  it('ignores sharing/visibility modifiers before `class` (physical indent)', () => {
    // `class` sits ~column 18 here; deriving indent from its column would emit
    // ~20 spaces. The physical line indent is 0, so members indent one unit.
    const source = [
      'public with sharing class Const {',
      '  public void run() {',
      "    String greeting = 'hello';",
      '  }',
      '}',
    ].join('\n');

    const extraction = extractionFor(source, "'hello'");

    expect(extraction).not.toBeNull();
    expect(extraction!.indent).toBe('  ');
    expect(extraction!.isInner).toBe(false);
  });

  it('indents inner-class members relative to the inner class line', () => {
    const source = [
      'public class Outer {',
      '  public class Inner {',
      '    public void run() {',
      "      String greeting = 'hi';",
      '    }',
      '  }',
      '}',
    ].join('\n');

    const extraction = extractionFor(source, "'hi'");

    expect(extraction).not.toBeNull();
    // Inner class line is indented two spaces; members add one more unit.
    expect(extraction!.indent).toBe('    ');
    expect(extraction!.isInner).toBe(true);
    expect(extraction!.isLiteral).toBe(true);
  });

  it('marks the insert offset just after the class body opening brace', () => {
    const source = [
      'public class Const {',
      '  public void run() {',
      "    String greeting = 'hello';",
      '  }',
      '}',
    ].join('\n');

    const extraction = extractionFor(source, "'hello'");

    expect(extraction).not.toBeNull();
    // The char immediately before the insert offset is the class body's `{`.
    expect(source.charAt(extraction!.insertOffset - 1)).toBe('{');
  });

  it('reports isLiteral false for a non-literal (arithmetic) expression', () => {
    const source = [
      'public class Const {',
      '  public void run() {',
      '    Integer total = 1 + 2;',
      '  }',
      '}',
    ].join('\n');

    const extraction = extractionFor(source, '1 + 2');

    expect(extraction).not.toBeNull();
    expect(extraction!.isLiteral).toBe(false);
  });

  it('reports isLiteral true for a prefix-of-literal (negative number)', () => {
    const source = [
      'public class Const {',
      '  public void run() {',
      '    Integer x = -5;',
      '  }',
      '}',
    ].join('\n');

    const extraction = extractionFor(source, '-5');

    expect(extraction).not.toBeNull();
    expect(extraction!.isLiteral).toBe(true);
  });

  it('returns null when no enclosing class / missing expression', () => {
    expect(findConstantExtraction(null)).toBeNull();
    expect(findConstantExtraction(undefined)).toBeNull();
  });
});
