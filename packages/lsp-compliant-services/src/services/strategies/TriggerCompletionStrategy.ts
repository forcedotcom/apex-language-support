/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { CompletionContext } from '../CompletionProcessingService';
import { CompletionStrategy, CompletionCandidate } from './CompletionStrategy';

interface TriggerVariableDescriptor {
  name: string;
  typeName: string;
}

const TRIGGER_VARIABLES: readonly TriggerVariableDescriptor[] = [
  { name: 'isExecuting', typeName: 'Boolean' },
  { name: 'isInsert', typeName: 'Boolean' },
  { name: 'isUpdate', typeName: 'Boolean' },
  { name: 'isDelete', typeName: 'Boolean' },
  { name: 'isBefore', typeName: 'Boolean' },
  { name: 'isAfter', typeName: 'Boolean' },
  { name: 'isUndelete', typeName: 'Boolean' },
  { name: 'new', typeName: 'List<SObject>' },
  { name: 'newMap', typeName: 'Map<Id,SObject>' },
  { name: 'old', typeName: 'List<SObject>' },
  { name: 'oldMap', typeName: 'Map<Id,SObject>' },
  { name: 'size', typeName: 'Integer' },
];

/** Supplies Trigger context variables from a parser-recorded member access. */
export class TriggerCompletionStrategy implements CompletionStrategy {
  readonly name = 'TriggerCompletion';

  canHandle(context: CompletionContext): boolean {
    return (
      this.isTriggerFile(context.document.uri) &&
      context.incompleteMemberAccess?.name.toLowerCase() === 'trigger'
    );
  }

  getCompletions(
    context: CompletionContext,
  ): Effect.Effect<CompletionCandidate[], never, never> {
    if (!this.canHandle(context)) return Effect.succeed([]);

    return Effect.succeed(
      TRIGGER_VARIABLES.map((variable) => ({
        symbol: this.makeTriggerVariableSymbol(variable),
        relevance: 0.95,
        context: 'trigger context variable',
      })),
    );
  }

  private isTriggerFile(uri: string): boolean {
    const lower = uri.toLowerCase();
    const query = lower.indexOf('?');
    const fragment = lower.indexOf('#');
    const endCandidates = [query, fragment].filter((index) => index >= 0);
    const end =
      endCandidates.length > 0 ? Math.min(...endCandidates) : lower.length;
    return lower.slice(0, end).endsWith('.trigger');
  }

  private makeTriggerVariableSymbol(variable: TriggerVariableDescriptor): any {
    return {
      id: `trigger-variable:${variable.name}`,
      name: variable.name,
      kind: 'variable',
      type: { name: variable.typeName },
      modifiers: { isStatic: false, isBuiltIn: true, visibility: 'public' },
      location: {
        symbolRange: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 0 },
        identifierRange: {
          startLine: 0,
          startColumn: 0,
          endLine: 0,
          endColumn: 0,
        },
      },
    };
  }
}
