/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CommonTokenStream } from 'antlr4';
import {
  ApexParser,
  ApexParserBaseListener,
  ApexParserFactory,
  ApexParseTreeWalker,
  WhenLiteralContext,
} from '@apexdevtools/apex-parser';

import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { ApexError } from '../../src/parser/listeners/ApexErrorListener';

/**
 * Grammar-coverage tests for the Summer '26 lexer/parser features introduced
 * by @apexdevtools/apex-parser 5.1.0-beta.1:
 *
 * - Multi-line string literals (`'''` ... `'''`)
 * - Fully-qualified enum values in switch `when` clauses
 *   (`whenLiteral` now matches `qualifiedName` in place of `id` — AST shape
 *    change for tree-walking consumers)
 * - SOSL bind variables (`:expr`) in the `WITH DIVISION` clause
 * - Anonymous Apex (`.apex`) parsing through the compiler service
 *
 * These guard against grammar drift: each feature must both parse cleanly and
 * produce the expected AST/symbol shape so downstream listeners stay aligned.
 */
describe("Summer '26 grammar coverage", () => {
  let compilerService: CompilerService;

  beforeEach(() => {
    compilerService = new CompilerService();
  });

  const compile = (source: string, fileName: string) => {
    const listener = new ApexSymbolCollectorListener(undefined, 'full');
    return compilerService.compile(source, fileName, listener, {
      collectReferences: true,
      resolveReferences: true,
    });
  };

  const expectNoSyntaxErrors = (errors: ApexError[]) => {
    const syntax = errors.filter((e) => e.type === 'syntax');
    expect(syntax).toEqual([]);
  };

  describe('multi-line string literals', () => {
    const source = [
      'public class MultilineString {',
      '  public String build() {',
      "    String json = '''",
      '{"hello": "world"}',
      "''';",
      '    return json;',
      '  }',
      '}',
    ].join('\n');

    it('parses without syntax errors and collects the class + local symbols', () => {
      const result = compile(source, 'MultilineString.cls');

      expectNoSyntaxErrors(result.errors);
      expect(result.result).not.toBeNull();
      const symbols = result.result!.getAllSymbols();
      // The multi-line string body must not break symbol collection: the
      // enclosing class, method, and the assigned local should all surface.
      expect(symbols.some((s) => s.name === 'MultilineString')).toBe(true);
      expect(symbols.some((s) => s.name === 'build')).toBe(true);
      expect(symbols.some((s) => s.name === 'json')).toBe(true);
    });

    it('lexes the body as a MultilineStringLiteral token', () => {
      const lexer = ApexParserFactory.createLexer(source);
      const tokenStream = new CommonTokenStream(lexer);
      tokenStream.fill();
      const symbolicNames = ApexParser.symbolicNames;
      const tokenTypeNames = tokenStream.tokens.map(
        (t) => symbolicNames[t.type],
      );
      expect(tokenTypeNames).toContain('MultilineStringLiteral');
    });
  });

  describe('fully-qualified enum values in switch when clauses', () => {
    const source = [
      'public class SwitchFqEnum {',
      '  public enum Season { SPRING, SUMMER }',
      '  public String describe(Season s) {',
      '    switch on s {',
      '      when SwitchFqEnum.Season.SPRING { return ' + "'s'" + '; }',
      '      when Season.SUMMER { return ' + "'u'" + '; }',
      '      when else { return ' + "'?'" + '; }',
      '    }',
      '  }',
      '}',
    ].join('\n');

    /** Collects the text + qualifiedName shape of each `when` literal. */
    class WhenLiteralCollector extends ApexParserBaseListener {
      readonly literals: Array<{
        text: string;
        hasQualifiedName: boolean;
      }> = [];

      enterWhenLiteral(ctx: WhenLiteralContext): void {
        this.literals.push({
          text: ctx.getText(),
          hasQualifiedName: ctx.qualifiedName() != null,
        });
      }
    }

    it('parses without syntax errors', () => {
      const result = compile(source, 'SwitchFqEnum.cls');
      expectNoSyntaxErrors(result.errors);
      expect(result.result).not.toBeNull();
    });

    it('nests both qualified and bare when values under qualifiedName (5.1 AST shape)', () => {
      const lexer = ApexParserFactory.createLexer(source);
      const tokenStream = new CommonTokenStream(lexer);
      const parser = new ApexParser(tokenStream);
      const collector = new WhenLiteralCollector();

      ApexParseTreeWalker.DEFAULT.walk(collector, parser.compilationUnit());

      const fq = collector.literals.find(
        (l) => l.text === 'SwitchFqEnum.Season.SPRING',
      );
      const bare = collector.literals.find((l) => l.text === 'Season.SUMMER');

      expect(fq).toBeDefined();
      expect(fq!.hasQualifiedName).toBe(true);
      // Per the 5.1 grammar, even a bare enum value resolves through
      // whenLiteral > qualifiedName rather than whenLiteral > id.
      expect(bare).toBeDefined();
      expect(bare!.hasQualifiedName).toBe(true);
    });
  });

  describe('SOSL bind variable in WITH DIVISION', () => {
    it('parses :bind inside WITH DIVISION without syntax errors', () => {
      const source = [
        'public class SoslWithDivision {',
        '  public List<List<SObject>> search(String div) {',
        "    return [FIND 'Acme' IN ALL FIELDS RETURNING Account " +
          'WITH DIVISION = :div];',
        '  }',
        '}',
      ].join('\n');

      const result = compile(source, 'SoslWithDivision.cls');
      expectNoSyntaxErrors(result.errors);
      expect(result.result).not.toBeNull();
    });

    it('still parses a literal WITH DIVISION value', () => {
      const source = [
        'public class SoslWithDivisionLiteral {',
        '  public List<List<SObject>> search() {',
        "    return [FIND 'Acme' IN ALL FIELDS RETURNING Account " +
          "WITH DIVISION = 'Global'];",
        '  }',
        '}',
      ].join('\n');

      const result = compile(source, 'SoslWithDivisionLiteral.cls');
      expectNoSyntaxErrors(result.errors);
      expect(result.result).not.toBeNull();
    });
  });

  describe('anonymous Apex', () => {
    it('parses an anonymous block (.apex) with top-level statements', () => {
      const source = [
        'Integer total = 0;',
        'for (Integer i = 0; i < 10; i++) {',
        '  total += i;',
        '}',
        'System.debug(total);',
      ].join('\n');

      const result = compile(source, 'anonymous.apex');
      expectNoSyntaxErrors(result.errors);
      expect(result.result).not.toBeNull();
    });

    it('reports syntax errors for malformed anonymous Apex', () => {
      const source = 'Integer x = ;';
      const result = compile(source, 'badAnonymous.apex');
      const syntax = result.errors.filter((e) => e.type === 'syntax');
      expect(syntax.length).toBeGreaterThan(0);
    });
  });
});
