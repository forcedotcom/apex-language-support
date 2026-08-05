/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { SymbolKind } from '../../src/types/symbol';
import { isChainedSymbolReference } from '../../src/utils/symbolNarrowing';

describe('ApexSymbolManager indexed receiver resolution', () => {
  it('resolves indexed fields and methods against the list element type', async () => {
    const fileUri = 'file:///test/IndexedAccess.cls';
    const source = `
      public class IndexedAccess {
        class Row {
          Integer value;
          String label() { return null; }
        }
        void exercise() {
          List<Row> rows = new List<Row>();
          Integer result = rows[0].value;
          String label = rows[0].label();
        }
      }
    `;
    const manager = new ApexSymbolManager();
    const listener = new ApexSymbolCollectorListener(undefined, 'full');
    const result = new CompilerService().compile(source, fileUri, listener, {
      collectReferences: true,
      resolveReferences: true,
    });
    expect(result.result).toBeDefined();
    await Effect.runPromise(manager.addSymbolTable(result.result!, fileUri));

    const chain = result
      .result!.getAllReferences()
      .find(
        (reference) =>
          isChainedSymbolReference(reference) &&
          reference.chainNodes?.at(-1)?.name === 'value',
      );
    expect(chain).toBeDefined();
    const valueNode = chain!.chainNodes!.at(-1)!;
    const rowsNode = chain!.chainNodes![0];

    const field = await manager.resolveChainedSymbolReference(
      chain!,
      {
        line: valueNode.location.identifierRange.startLine,
        character: valueNode.location.identifierRange.startColumn,
      },
      fileUri,
    );
    const receiver = await manager.resolveChainedSymbolReference(
      chain!,
      {
        line: rowsNode.location.identifierRange.startLine,
        character: rowsNode.location.identifierRange.startColumn,
      },
      fileUri,
    );

    expect(field?.kind).toBe(SymbolKind.Field);
    expect(field?.name).toBe('value');
    expect(receiver?.kind).toBe(SymbolKind.Variable);
    expect(receiver?.name).toBe('rows');

    const methodChain = result
      .result!.getAllReferences()
      .find(
        (reference) =>
          isChainedSymbolReference(reference) &&
          reference.chainNodes?.at(-1)?.name === 'label',
      );
    expect(methodChain).toBeDefined();
    const labelNode = methodChain!.chainNodes!.at(-1)!;
    const method = await manager.resolveChainedSymbolReference(
      methodChain!,
      {
        line: labelNode.location.identifierRange.startLine,
        character: labelNode.location.identifierRange.startColumn,
      },
      fileUri,
    );
    expect(method?.kind).toBe(SymbolKind.Method);
    expect(method?.name).toBe('label');
  });
});
