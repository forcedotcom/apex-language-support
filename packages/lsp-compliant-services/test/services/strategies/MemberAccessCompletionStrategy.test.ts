/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { getLogger } from '@salesforce/apex-lsp-shared';
import { ApexSymbolManager } from '@salesforce/apex-lsp-parser-ast';
import { MemberAccessCompletionStrategy } from '../../../src/services/strategies/MemberAccessCompletionStrategy';
import {
  compileAndRegister,
  makeTextDocument,
  makeCompletionContext,
  loadFixture,
} from './testHelpers';

describe('MemberAccessCompletionStrategy', () => {
  let strategy: MemberAccessCompletionStrategy;
  let symbolManager: ApexSymbolManager;
  const logger = getLogger();

  beforeEach(async () => {
    symbolManager = new ApexSymbolManager();
    strategy = new MemberAccessCompletionStrategy(logger, symbolManager);

    await compileAndRegister(
      symbolManager,
      'MemberAccessTestClass.cls',
      'file:///test/MemberAccessTestClass.cls',
    );
  });

  describe('canHandle', () => {
    it('should handle when triggerCharacter is dot', () => {
      const doc = makeTextDocument('instance.', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 9, {
        triggerCharacter: '.',
      });
      expect(strategy.canHandle(context)).toBe(true);
    });

    it('should handle when line ends with dot', () => {
      const doc = makeTextDocument('    instance.', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 13);
      expect(strategy.canHandle(context)).toBe(true);
    });

    it('should not handle when no dot present', () => {
      const doc = makeTextDocument('    someVar', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 11);
      expect(strategy.canHandle(context)).toBe(false);
    });

    it('should not handle when dot is in a string literal', () => {
      const doc = makeTextDocument(
        "    String x = 'hello world'",
        'file:///test/Test.cls',
      );
      const context = makeCompletionContext(doc, 0, 28);
      expect(strategy.canHandle(context)).toBe(false);
    });
  });

  describe('parseDotExpression', () => {
    it('should identify this. as this-kind expression', () => {
      const doc = makeTextDocument('    this.', 'file:///test/Test.cls');
      const result = strategy.parseDotExpression(doc, {
        line: 0,
        character: 9,
      });
      expect(result.kind).toBe('this');
      expect(result.segments).toContain('this');
      expect(result.expectStatic).toBe(false);
    });

    it('should identify super. as super-kind expression', () => {
      const doc = makeTextDocument('    super.', 'file:///test/Test.cls');
      const result = strategy.parseDotExpression(doc, {
        line: 0,
        character: 10,
      });
      expect(result.kind).toBe('super');
      expect(result.segments).toContain('super');
      expect(result.expectStatic).toBe(false);
    });

    it('should identify ClassName. as type-kind (static access)', () => {
      const doc = makeTextDocument(
        '    MemberAccessTestClass.',
        'file:///test/Test.cls',
      );
      const result = strategy.parseDotExpression(doc, {
        line: 0,
        character: 26,
      });
      expect(result.kind).toBe('type');
      expect(result.segments).toContain('MemberAccessTestClass');
      expect(result.expectStatic).toBe(true);
    });

    it('should identify variable. as variable-kind', () => {
      const doc = makeTextDocument('    myInstance.', 'file:///test/Test.cls');
      const result = strategy.parseDotExpression(doc, {
        line: 0,
        character: 15,
      });
      expect(result.kind).toBe('variable');
      expect(result.segments).toContain('myInstance');
      expect(result.expectStatic).toBe(false);
    });

    it('should identify method chain as method-chain kind', () => {
      const doc = makeTextDocument(
        '    obj.getAccount().',
        'file:///test/Test.cls',
      );
      const result = strategy.parseDotExpression(doc, {
        line: 0,
        character: 21,
      });
      expect(result.kind).toBe('method-chain');
      expect(result.segments.length).toBe(2);
      expect(result.segments[0]).toBe('obj');
      expect(result.segments[1]).toBe('getAccount()');
    });

    it('should return unknown for empty expression', () => {
      const doc = makeTextDocument('.', 'file:///test/Test.cls');
      const result = strategy.parseDotExpression(doc, {
        line: 0,
        character: 1,
      });
      expect(result.kind).toBe('unknown');
    });
  });

  describe('getCompletions', () => {
    it('should return members for static access (ClassName.)', async () => {
      const content = loadFixture('MemberAccessTestClass.cls');
      const doc = makeTextDocument(
        content + '\n// MemberAccessTestClass.',
        'file:///test/MemberAccessTestClass.cls',
      );
      const lines = doc.getText().split('\n');
      const lastLine = lines.length - 1;

      const context = makeCompletionContext(
        doc,
        lastLine,
        lines[lastLine].length,
        {
          triggerCharacter: '.',
        },
      );

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      const names = candidates.map((c) => c.symbol.label ?? c.symbol.name);
      expect(names).toContain('getStaticValue');
      expect(names).toContain('staticField');
    });

    it('should return instance members for this. access', async () => {
      const content = [
        'public class InlineTest {',
        '  public String myField;',
        '  public void myMethod() {',
        '    this.',
        '  }',
        '}',
      ].join('\n');
      const uri = 'file:///test/InlineTest.cls';
      const doc = makeTextDocument(content, uri);

      const compilerService = new (
        await import('@salesforce/apex-lsp-parser-ast')
      ).CompilerService();
      const symbolTable = new (
        await import('@salesforce/apex-lsp-parser-ast')
      ).SymbolTable();
      const listener = new (
        await import('@salesforce/apex-lsp-parser-ast')
      ).FullSymbolCollectorListener(symbolTable);
      compilerService.compile(content, uri, listener);
      await Effect.runPromise(symbolManager.addSymbolTable(symbolTable, uri));

      const context = makeCompletionContext(doc, 3, 9, {
        triggerCharacter: '.',
      });

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      const names = candidates.map((c) => c.symbol.label ?? c.symbol.name);
      expect(names).toContain('myField');
      expect(names).toContain('myMethod');
    });

    it('should return empty for unresolvable expression', async () => {
      const doc = makeTextDocument(
        '    unknownVariable.',
        'file:///test/Unknown.cls',
      );
      const context = makeCompletionContext(doc, 0, 20, {
        triggerCharacter: '.',
      });

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      expect(candidates).toEqual([]);
    });
  });

  describe('getMembersOfType (static vs instance filtering)', () => {
    it('should only return static members when expectStatic is true', async () => {
      loadFixture('MemberAccessTestClass.cls');
      const uri = 'file:///test/MemberAccessTestClass.cls';

      const symbolTable = await symbolManager.getSymbolTableForFile(uri);
      expect(symbolTable).toBeDefined();

      const allSymbols = symbolTable!.getAllSymbols();
      const typeSymbol = allSymbols.find(
        (s) => s.name === 'MemberAccessTestClass' && s.kind === 'class',
      );
      expect(typeSymbol).toBeDefined();

      const members = await strategy.getMembersOfType(
        typeSymbol as any,
        true,
        uri,
      );

      for (const m of members) {
        expect(m.isStatic).toBe(true);
      }
    });

    it('should only return instance members when expectStatic is false', async () => {
      const uri = 'file:///test/MemberAccessTestClass.cls';

      const symbolTable = await symbolManager.getSymbolTableForFile(uri);
      const allSymbols = symbolTable!.getAllSymbols();
      const typeSymbol = allSymbols.find(
        (s) => s.name === 'MemberAccessTestClass' && s.kind === 'class',
      );

      const members = await strategy.getMembersOfType(
        typeSymbol as any,
        false,
        uri,
      );

      for (const m of members) {
        expect(m.isStatic).toBe(false);
      }
    });
  });
});
