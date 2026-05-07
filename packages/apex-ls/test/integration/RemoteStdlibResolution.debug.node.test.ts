/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Unit test: verify that the remote resource loader layer on enrichment
 * workers correctly reconstructs SymbolTable instances from serialized data.
 *
 * Root cause: structured clone over MessagePort strips class prototypes.
 * The fix calls SymbolTable.fromSerializedData() to reconstruct.
 */

import { SymbolTable } from '@salesforce/apex-lsp-parser-ast';

describe('Remote stdlib SymbolTable deserialization', () => {
  it('SymbolTable.fromSerializedData reconstructs from a plain object', () => {
    // Simulate what cloneForWire() produces: a plain object with arrays
    const serialized = {
      symbols: [
        {
          name: 'String',
          kind: 'class',
          location: {
            symbolRange: {
              startLine: 1,
              startColumn: 0,
              endLine: 100,
              endColumn: 1,
            },
            identifierRange: {
              startLine: 1,
              startColumn: 13,
              endLine: 1,
              endColumn: 19,
            },
          },
          modifiers: { isBuiltIn: true },
        },
      ],
      references: [],
      hierarchicalReferences: [],
      metadata: { documentVersion: 1 },
      fileUri: 'apexlib://resources/StandardApexLibrary/System/String.cls',
    };

    // This is what the fix does — reconstruct from serialized data
    const symbolTable = SymbolTable.fromSerializedData(serialized);

    // Verify it's a proper SymbolTable instance with working methods
    expect(symbolTable).toBeInstanceOf(SymbolTable);
    expect(typeof symbolTable.getAllSymbols).toBe('function');
    expect(typeof symbolTable.getAllReferences).toBe('function');
    expect(typeof symbolTable.getMetadata).toBe('function');

    const symbols = symbolTable.getAllSymbols();
    expect(symbols.length).toBeGreaterThan(0);
    expect(symbols[0].name).toBe('String');
  });

  it('plain object without fromSerializedData lacks SymbolTable methods', () => {
    // This is what happened BEFORE the fix — raw structured clone result
    const plainObject = {
      symbols: [{ name: 'String', kind: 'class' }],
      references: [],
      metadata: {},
    };

    // A plain object does NOT have SymbolTable methods
    expect(plainObject).not.toBeInstanceOf(SymbolTable);
    expect((plainObject as any).getAllSymbols).toBeUndefined();
    expect((plainObject as any).getMetadata).toBeUndefined();
  });

  it('fromJSON handles toJSON wire format ({key, symbol} entries)', () => {
    // SymbolTable.toJSON() produces {symbols: [{key, symbol}], scopes: []}
    // cloneForWire (JSON round-trip) serializes via toJSON, so the IPC
    // result has this shape — not a flat ApexSymbol array.
    const st = new SymbolTable();
    st.setFileUri('apexlib://resources/StandardApexLibrary/System/String.cls');
    st.addSymbol({
      id: 'system-string',
      name: 'String',
      kind: 'class' as any,
      location: {
        symbolRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 100,
          endColumn: 1,
        },
        identifierRange: {
          startLine: 1,
          startColumn: 13,
          endLine: 1,
          endColumn: 19,
        },
      },
      key: { unifiedId: 'system-string' },
      parentId: null,
    } as any);

    // Simulate cloneForWire: JSON round-trip strips prototype
    const wireData = JSON.parse(JSON.stringify(st));
    expect(wireData.symbols[0]).toHaveProperty('symbol');

    const reconstructed = SymbolTable.fromJSON(wireData);
    expect(reconstructed).toBeInstanceOf(SymbolTable);

    const symbols = reconstructed.getAllSymbols();
    expect(symbols).toHaveLength(1);
    expect(symbols[0].name).toBe('String');
    expect(symbols[0].location.identifierRange.startLine).toBe(1);
  });
});
