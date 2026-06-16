/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { TriggerCompletionStrategy } from '../../../src/services/strategies/TriggerCompletionStrategy';
import { makeTextDocument, makeCompletionContext } from './testHelpers';

describe('TriggerCompletionStrategy', () => {
  let strategy: TriggerCompletionStrategy;

  beforeEach(() => {
    strategy = new TriggerCompletionStrategy();
  });

  describe('canHandle', () => {
    it('should handle trigger files with Trigger. prefix', () => {
      const doc = makeTextDocument(
        '  Trigger.',
        'file:///test/MyTrigger.trigger',
      );
      const context = makeCompletionContext(doc, 0, 10);
      expect(strategy.canHandle(context)).toBe(true);
    });

    it('should handle trigger files at top level (no dot)', () => {
      const doc = makeTextDocument('  tri', 'file:///test/MyTrigger.trigger');
      const context = makeCompletionContext(doc, 0, 5);
      expect(strategy.canHandle(context)).toBe(true);
    });

    it('should not handle non-trigger files', () => {
      const doc = makeTextDocument('  Trigger.', 'file:///test/MyClass.cls');
      const context = makeCompletionContext(doc, 0, 10);
      expect(strategy.canHandle(context)).toBe(false);
    });

    it('should not handle trigger files when line ends with a non-Trigger dot', () => {
      const doc = makeTextDocument(
        '  someVar.',
        'file:///test/MyTrigger.trigger',
      );
      const context = makeCompletionContext(doc, 0, 10);
      expect(strategy.canHandle(context)).toBe(false);
    });

    it('should handle case-insensitive Trigger. prefix', () => {
      const doc = makeTextDocument(
        '  trigger.',
        'file:///test/MyTrigger.trigger',
      );
      const context = makeCompletionContext(doc, 0, 10);
      expect(strategy.canHandle(context)).toBe(true);
    });

    it('should handle partial prefix after Trigger.', () => {
      const doc = makeTextDocument(
        '  Trigger.is',
        'file:///test/MyTrigger.trigger',
      );
      const context = makeCompletionContext(doc, 0, 12);
      expect(strategy.canHandle(context)).toBe(true);
    });
  });

  describe('getCompletions', () => {
    it('should return all trigger context variables after Trigger.', async () => {
      const doc = makeTextDocument(
        '  Trigger.',
        'file:///test/MyTrigger.trigger',
      );
      const context = makeCompletionContext(doc, 0, 10);

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      expect(candidates.length).toBe(12);

      const names = candidates.map((c) => c.symbol.name);
      expect(names).toContain('isExecuting');
      expect(names).toContain('isInsert');
      expect(names).toContain('isUpdate');
      expect(names).toContain('isDelete');
      expect(names).toContain('isBefore');
      expect(names).toContain('isAfter');
      expect(names).toContain('isUndelete');
      expect(names).toContain('new');
      expect(names).toContain('newMap');
      expect(names).toContain('old');
      expect(names).toContain('oldMap');
      expect(names).toContain('size');
    });

    it('should set relevance to 0.95 for trigger context variables', async () => {
      const doc = makeTextDocument(
        '  Trigger.',
        'file:///test/MyTrigger.trigger',
      );
      const context = makeCompletionContext(doc, 0, 10);

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      for (const candidate of candidates) {
        expect(candidate.relevance).toBe(0.95);
        expect(candidate.context).toBe('trigger context variable');
      }
    });

    it('should include correct type information for trigger variables', async () => {
      const doc = makeTextDocument(
        '  Trigger.',
        'file:///test/MyTrigger.trigger',
      );
      const context = makeCompletionContext(doc, 0, 10);

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      const newVar = candidates.find((c) => c.symbol.name === 'new');
      expect(newVar).toBeDefined();
      expect(newVar!.symbol.type.name).toBe('List<SObject>');

      const newMapVar = candidates.find((c) => c.symbol.name === 'newMap');
      expect(newMapVar).toBeDefined();
      expect(newMapVar!.symbol.type.name).toBe('Map<Id,SObject>');

      const isInsert = candidates.find((c) => c.symbol.name === 'isInsert');
      expect(isInsert).toBeDefined();
      expect(isInsert!.symbol.type.name).toBe('Boolean');

      const size = candidates.find((c) => c.symbol.name === 'size');
      expect(size).toBeDefined();
      expect(size!.symbol.type.name).toBe('Integer');
    });

    it('should suggest trigger keyword at top-level with matching prefix', async () => {
      const doc = makeTextDocument('tri', 'file:///test/MyTrigger.trigger');
      const context = makeCompletionContext(doc, 0, 3);

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      const triggerKeyword = candidates.find(
        (c) => c.symbol.name === 'trigger',
      );
      expect(triggerKeyword).toBeDefined();
      expect(triggerKeyword!.relevance).toBe(0.9);
      expect(triggerKeyword!.context).toBe('trigger keyword');
    });

    it('should suggest trigger keyword at empty top-level line', async () => {
      const doc = makeTextDocument('', 'file:///test/MyTrigger.trigger');
      const context = makeCompletionContext(doc, 0, 0);

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      const triggerKeyword = candidates.find(
        (c) => c.symbol.name === 'trigger',
      );
      expect(triggerKeyword).toBeDefined();
    });

    it('should not suggest trigger keyword when prefix does not match', async () => {
      const doc = makeTextDocument('class', 'file:///test/MyTrigger.trigger');
      const context = makeCompletionContext(doc, 0, 5);

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      const triggerKeyword = candidates.find(
        (c) => c.symbol.name === 'trigger',
      );
      expect(triggerKeyword).toBeUndefined();
    });

    it('should not suggest trigger keyword when line has other content before', async () => {
      const doc = makeTextDocument('x tri', 'file:///test/MyTrigger.trigger');
      const context = makeCompletionContext(doc, 0, 5);

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      const triggerKeyword = candidates.find(
        (c) => c.symbol.name === 'trigger',
      );
      expect(triggerKeyword).toBeUndefined();
    });
  });
});
