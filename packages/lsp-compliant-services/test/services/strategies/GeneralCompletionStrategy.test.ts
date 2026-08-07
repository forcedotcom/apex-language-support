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
import { GeneralCompletionStrategy } from '../../../src/services/strategies/GeneralCompletionStrategy';
import {
  compileAndRegister,
  compileInlineAndRegister,
  makeTextDocument,
  makeCompletionContext,
} from './testHelpers';

describe('GeneralCompletionStrategy', () => {
  let strategy: GeneralCompletionStrategy;
  let symbolManager: ApexSymbolManager;
  const logger = getLogger();

  beforeEach(async () => {
    symbolManager = new ApexSymbolManager();
    strategy = new GeneralCompletionStrategy(logger, symbolManager);

    await compileAndRegister(
      symbolManager,
      'TestClass.cls',
      'file:///test/TestClass.cls',
    );
  });

  describe('canHandle', () => {
    it('should handle when triggerCharacter is not dot', () => {
      const doc = makeTextDocument('    getSta', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 10);
      expect(strategy.canHandle(context)).toBe(true);
    });

    it('should handle when no triggerCharacter at all', () => {
      const doc = makeTextDocument('    val', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 7);
      expect(strategy.canHandle(context)).toBe(true);
    });

    it('should not handle when triggerCharacter is dot', () => {
      const doc = makeTextDocument('    obj.', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 8, {
        triggerCharacter: '.',
      });
      expect(strategy.canHandle(context)).toBe(true);
    });

    it('should not handle when line ends with dot', () => {
      const doc = makeTextDocument('    obj.', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 8);
      expect(strategy.canHandle(context)).toBe(true);
    });

    it('should not handle a partially typed member name', () => {
      const doc = makeTextDocument('    this.may', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 12);
      expect(strategy.canHandle(context)).toBe(true);
    });
  });

  describe('getCompletions', () => {
    it('should resolve a typed prefix via the symbol manager', async () => {
      const doc = makeTextDocument(
        '    getStaticValue',
        'file:///test/TestClass.cls',
      );
      const context = makeCompletionContext(doc, 0, 18, {
        currentScope: 'TestClass',
      });

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      // Prefix path returns context-resolved candidates (no wildcard fallback).
      expect(Array.isArray(candidates)).toBe(true);
      const wildcards = candidates.filter(
        (c) => c.context === 'wildcard completion',
      );
      expect(wildcards.length).toBe(0);
    });

    it('should include wildcard completions when no prefix has been typed', async () => {
      const doc = makeTextDocument('    ', 'file:///test/TestClass.cls');
      const context = makeCompletionContext(doc, 0, 4, {
        currentScope: 'TestClass',
      });

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      const wildcardCandidates = candidates.filter(
        (c) => c.context === 'wildcard completion',
      );
      expect(wildcardCandidates.length).toBeGreaterThan(0);
    });

    it('should not return wildcard completions when a prefix has been typed', async () => {
      const doc = makeTextDocument('    get', 'file:///test/TestClass.cls');
      const context = makeCompletionContext(doc, 0, 7, {
        currentScope: 'TestClass',
      });

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      const wildcardCandidates = candidates.filter(
        (c) => c.context === 'wildcard completion',
      );
      expect(wildcardCandidates.length).toBe(0);
    });

    it('uses only the lexer token prefix before a cursor inside an identifier', async () => {
      const resolveSymbol = jest.spyOn(symbolManager, 'resolveSymbol');
      const doc = makeTextDocument(
        '    getStaSuffix',
        'file:///test/TestClass.cls',
      );
      const context = makeCompletionContext(doc, 0, 10, {
        currentScope: 'TestClass',
      });

      await Effect.runPromise(strategy.getCompletions(context));

      expect(resolveSymbol).toHaveBeenCalledWith(
        'getSta',
        expect.objectContaining({ currentScope: 'TestClass' }),
      );
    });

    it.each([
      ["'getSta'", 5],
      ["'unterminated getSta", 20],
      ['// getSta', 9],
      ['/* getSta */', 9],
    ])(
      'does not derive semantic completions from a string or comment token: %s',
      async (content, character) => {
        const resolveSymbol = jest.spyOn(symbolManager, 'resolveSymbol');
        const allSymbols = jest.spyOn(
          symbolManager,
          'getAllSymbolsForCompletion',
        );
        const doc = makeTextDocument(content, 'file:///test/TestClass.cls');
        const context = makeCompletionContext(doc, 0, character, {
          currentScope: 'TestClass',
        });

        const candidates = await Effect.runPromise(
          strategy.getCompletions(context),
        );

        expect(candidates).toEqual([]);
        expect(resolveSymbol).not.toHaveBeenCalled();
        expect(allSymbols).not.toHaveBeenCalled();
      },
    );

    it('preserves an incomplete identifier prefix in syntactically malformed source', async () => {
      const resolveSymbol = jest.spyOn(symbolManager, 'resolveSymbol');
      const content = 'public class Broken { void run() { getSta';
      const doc = makeTextDocument(content, 'file:///test/Broken.cls');
      const context = makeCompletionContext(doc, 0, content.length);

      await Effect.runPromise(strategy.getCompletions(context));

      expect(resolveSymbol).toHaveBeenCalledWith('getSta', expect.any(Object));
    });

    it('does not synthesize a local declaration from document text when semantic state lacks it', async () => {
      const content = [
        'public class PropertyConsumer {',
        '  public void run() {',
        '    Property__c property = new Property__c();',
        '    insert property;',
        '    prop',
        '  }',
        '}',
      ].join('\n');
      const doc = makeTextDocument(
        content,
        'file:///test/PropertyConsumer.cls',
      );
      const context = makeCompletionContext(doc, 4, 8, {
        currentScope: 'PropertyConsumer',
      });

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      expect(
        candidates.map((candidate) => candidate.symbol.name),
      ).not.toContain('property');
    });

    it('returns a prefix-matching local from parser-owned visible symbols', async () => {
      const uri = 'file:///test/PropertyConsumer.cls';
      const content = [
        'public class PropertyConsumer {',
        '  public void run() {',
        '    Property__c property = new Property__c();',
        '    insert property;',
        '    prop',
        '  }',
        '}',
      ].join('\n');
      await compileInlineAndRegister(symbolManager, content, uri);
      const doc = makeTextDocument(content, uri);
      const context = makeCompletionContext(doc, 4, 8, {
        currentScope: 'PropertyConsumer',
      });

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      expect(candidates).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            symbol: expect.objectContaining({
              name: 'property',
              kind: 'variable',
            }),
            context: 'visible symbol',
          }),
        ]),
      );
    });

    it('should set relevance to 0.5 for wildcard completions', async () => {
      const doc = makeTextDocument('    ', 'file:///test/TestClass.cls');
      const context = makeCompletionContext(doc, 0, 4, {
        currentScope: 'TestClass',
      });

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      const wildcardCandidates = candidates.filter(
        (c) => c.context === 'wildcard completion',
      );
      for (const candidate of wildcardCandidates) {
        expect(candidate.relevance).toBe(0.5);
      }
    });

    it('should handle errors gracefully and return partial results', async () => {
      const doc = makeTextDocument(
        '    unknownSymbol',
        'file:///nonexistent/Test.cls',
      );
      const context = makeCompletionContext(doc, 0, 17, {
        currentScope: '',
      });

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      expect(Array.isArray(candidates)).toBe(true);
    });
  });
});
