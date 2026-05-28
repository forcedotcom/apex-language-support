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
      expect(strategy.canHandle(context)).toBe(false);
    });
  });

  describe('getCompletions', () => {
    it('should return symbols from all loaded sources', async () => {
      const content = [
        'public class InlineTest {',
        '  public void method() {',
        '    get',
        '  }',
        '}',
      ].join('\n');
      const uri = 'file:///test/InlineTest.cls';
      const doc = makeTextDocument(content, uri);

      const context = makeCompletionContext(doc, 2, 7, {
        currentScope: 'InlineTest.method',
      });

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      expect(candidates.length).toBeGreaterThan(0);
    });

    it('should include wildcard completions for all symbols', async () => {
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
