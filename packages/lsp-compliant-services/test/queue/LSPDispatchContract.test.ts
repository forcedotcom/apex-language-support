/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, expectTypeOf, it } from 'vitest';
import type { Hover, WorkspaceEdit } from 'vscode-languageserver-protocol';
import type {
  LSPDispatchParams,
  LSPDispatchResult,
  WorkerDispatchArgs,
} from '../../src/queue/LSPDispatchContract';
import type { WorkerDispatcher } from '../../src/queue/LSPQueueManager';
import type { WorkerDispatchStrategy } from '../../src/queue/WorkerDispatchStrategy';

describe('LSP dispatch contract', () => {
  it('pairs standard LSP request params with their result type', () => {
    expectTypeOf<LSPDispatchParams<'hover'>>().toMatchTypeOf<{
      textDocument: { uri: string };
      position: { line: number; character: number };
    }>();
    expectTypeOf<LSPDispatchResult<'hover'>>().toEqualTypeOf<Hover | null>();
    expectTypeOf<
      LSPDispatchResult<'rename'>
    >().toEqualTypeOf<WorkspaceEdit | null>();
  });

  it('requires repository-specific dispatch extensions', () => {
    const semanticTokens: LSPDispatchParams<'semanticTokens'> = {
      textDocument: { uri: 'file:///Test.cls' },
      semanticTokenLegend: { tokenTypes: [], tokenModifiers: [] },
    };
    expectTypeOf(semanticTokens).toMatchTypeOf<
      LSPDispatchParams<'semanticTokens'>
    >();

    // @ts-expect-error Semantic token dispatch must carry the negotiated legend.
    const missingLegend: LSPDispatchParams<'semanticTokens'> = {
      textDocument: { uri: 'file:///Test.cls' },
    };
    expectTypeOf(missingLegend).toMatchTypeOf<
      LSPDispatchParams<'semanticTokens'>
    >();
  });

  it('rejects params from a different request kind', () => {
    // @ts-expect-error Rename dispatches require the new identifier.
    const missingNewName: LSPDispatchParams<'rename'> = {
      textDocument: { uri: 'file:///Test.cls' },
      position: { line: 0, character: 0 },
    };
    expectTypeOf(missingNewName).toMatchTypeOf<LSPDispatchParams<'rename'>>();
  });

  it('keeps request kind and params correlated for union-valued calls', () => {
    const strategy = null as unknown as WorkerDispatchStrategy;
    const dispatcher = null as unknown as WorkerDispatcher;
    const kind: 'hover' | 'rename' = Math.random() > 0.5 ? 'hover' : 'rename';

    if (false) {
      // @ts-expect-error A union-valued request type requires params valid for every branch.
      strategy.dispatch(kind, {
        textDocument: { uri: 'file:///Test.cls' },
        position: { line: 0, character: 0 },
      });

      // @ts-expect-error The queue dispatcher has the same correlated contract.
      dispatcher.dispatch(kind, {
        textDocument: { uri: 'file:///Test.cls' },
        position: { line: 0, character: 0 },
      });

      const validHover: Extract<WorkerDispatchArgs, ['hover', unknown]> = [
        'hover',
        {
          textDocument: { uri: 'file:///Test.cls' },
          position: { line: 0, character: 0 },
        },
      ];
      strategy.dispatch(...validHover);
      dispatcher.dispatch(...validHover);
    }
  });
});
