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
  const strategy = new TriggerCompletionStrategy();

  const triggerContext = (
    content = 'Trigger.',
    uri = 'file:///test/MyTrigger.trigger',
    receiver = 'Trigger',
  ) => {
    const document = makeTextDocument(content, uri);
    return {
      ...makeCompletionContext(document, 0, content.length),
      incompleteMemberAccess: {
        name: receiver,
        context: 5,
        location: {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: receiver.length,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: receiver.length,
          },
        },
        semanticContext: {
          memberAccess: {
            kind: 'member-access' as const,
            receiverRange: {
              startLine: 1,
              startColumn: 0,
              endLine: 1,
              endColumn: receiver.length,
            },
            operatorRange: {
              startLine: 1,
              startColumn: receiver.length,
              endLine: 1,
              endColumn: receiver.length + 1,
            },
            incomplete: true,
          },
        },
      },
    };
  };

  it('handles parser-recorded Trigger member access in trigger files', () => {
    expect(strategy.canHandle(triggerContext())).toBe(true);
    expect(
      strategy.canHandle(triggerContext('trigger.', undefined, 'trigger')),
    ).toBe(true);
  });

  it('does not infer Trigger access from document text', () => {
    const document = makeTextDocument(
      '// Trigger. appears only in a comment',
      'file:///test/MyTrigger.trigger',
    );
    expect(strategy.canHandle(makeCompletionContext(document, 0, 11))).toBe(
      false,
    );
  });

  it('does not handle a different receiver or a class file', () => {
    expect(
      strategy.canHandle(triggerContext('someVar.', undefined, 'someVar')),
    ).toBe(false);
    expect(
      strategy.canHandle(
        triggerContext('Trigger.', 'file:///test/MyClass.cls', 'Trigger'),
      ),
    ).toBe(false);
  });

  it('returns all typed trigger context variables', async () => {
    const candidates = await Effect.runPromise(
      strategy.getCompletions(triggerContext()),
    );

    expect(candidates).toHaveLength(12);
    expect(candidates.map((candidate) => candidate.symbol.name)).toEqual(
      expect.arrayContaining([
        'isExecuting',
        'isInsert',
        'isUpdate',
        'isDelete',
        'isBefore',
        'isAfter',
        'isUndelete',
        'new',
        'newMap',
        'old',
        'oldMap',
        'size',
      ]),
    );
    expect(
      candidates.find((candidate) => candidate.symbol.name === 'new')?.symbol
        .type.name,
    ).toBe('List<SObject>');
  });

  it('returns no candidates without parser-owned member access', async () => {
    const document = makeTextDocument(
      'Trigger.',
      'file:///test/MyTrigger.trigger',
    );
    await expect(
      Effect.runPromise(
        strategy.getCompletions(makeCompletionContext(document, 0, 8)),
      ),
    ).resolves.toEqual([]);
  });
});
