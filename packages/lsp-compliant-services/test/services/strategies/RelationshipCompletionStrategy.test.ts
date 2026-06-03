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
import { RelationshipCompletionStrategy } from '../../../src/services/strategies/RelationshipCompletionStrategy';
import {
  compileAndRegister,
  makeTextDocument,
  makeCompletionContext,
} from './testHelpers';

describe('RelationshipCompletionStrategy', () => {
  let strategy: RelationshipCompletionStrategy;
  let symbolManager: ApexSymbolManager;
  const logger = getLogger();

  beforeEach(async () => {
    symbolManager = new ApexSymbolManager();
    strategy = new RelationshipCompletionStrategy(logger, symbolManager);

    await compileAndRegister(
      symbolManager,
      'TestClass.cls',
      'file:///test/TestClass.cls',
    );
  });

  describe('canHandle', () => {
    it('should return true for non-dot contexts (supplementary strategy)', () => {
      const doc = makeTextDocument('    someVar', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 11);
      expect(strategy.canHandle(context)).toBe(true);
    });

    it('should not fire when triggered by a dot', () => {
      const doc = makeTextDocument('    obj.', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 8, {
        triggerCharacter: '.',
      });
      expect(strategy.canHandle(context)).toBe(false);
    });

    it('should not fire when the line up to cursor ends with a dot', () => {
      const doc = makeTextDocument('    obj.', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 8);
      expect(strategy.canHandle(context)).toBe(false);
    });

    it('should return true with empty context', () => {
      const doc = makeTextDocument('', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 0);
      expect(strategy.canHandle(context)).toBe(true);
    });
  });

  describe('getCompletions', () => {
    it('should return relationship-based completions for known file', async () => {
      const doc = makeTextDocument(
        '    getStaticValue',
        'file:///test/TestClass.cls',
      );
      const context = makeCompletionContext(doc, 0, 18);

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      expect(Array.isArray(candidates)).toBe(true);
    });

    it('should set relevance to 0.7 for relationship candidates', async () => {
      const doc = makeTextDocument(
        '    getValue',
        'file:///test/TestClass.cls',
      );
      const context = makeCompletionContext(doc, 0, 12);

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      for (const candidate of candidates) {
        expect(candidate.relevance).toBe(0.7);
      }
    });

    it('should include context description with related symbol name', async () => {
      const doc = makeTextDocument('    test', 'file:///test/TestClass.cls');
      const context = makeCompletionContext(doc, 0, 8);

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      for (const candidate of candidates) {
        expect(candidate.context).toMatch(/^related to /);
      }
    });

    it('should return empty for file with no symbols', async () => {
      const doc = makeTextDocument('    test', 'file:///test/NonExistent.cls');
      const context = makeCompletionContext(doc, 0, 8);

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      expect(candidates).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      const doc = makeTextDocument('    test', 'file:///test/Unknown.cls');
      const context = makeCompletionContext(doc, 0, 8);

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      expect(Array.isArray(candidates)).toBe(true);
    });
  });
});
