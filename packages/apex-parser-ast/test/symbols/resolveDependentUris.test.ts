/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { resolveDependentUris } from '../../src/symbols/ops/resolveDependentUris';
import type { ISymbolManager } from '../../src/types/ISymbolManager';
import type { ApexSymbol } from '../../src/types/symbol';
import type { ReferenceResult } from '../../src/symbols/ApexSymbolRefManager';

const FILE_A = 'file:///A.cls';
const FILE_B = 'file:///B.cls';
const FILE_C = 'file:///C.cls';
const FILE_D = 'file:///D.cls';

function symbol(name: string, fileUri: string): ApexSymbol {
  return { name, fileUri } as unknown as ApexSymbol;
}

function reference(fileUri: string): ReferenceResult {
  return { fileUri } as ReferenceResult;
}

function symbolTableFor(uri: string) {
  return {
    getAllSymbols: () => [{ uri }],
    getAllReferences: () => [],
    getAllHierarchicalReferences: () => [],
    getMetadata: () => ({ fileUri: uri }),
    getFileUri: () => uri,
  } as any;
}

function makeManager(opts: {
  symbolsInFile: Record<string, ApexSymbol[]>;
  referencesTo: Map<string, ReferenceResult[]>;
  symbolTables?: Record<string, ReturnType<typeof symbolTableFor>>;
}): ISymbolManager {
  const symbolTables =
    opts.symbolTables ??
    Object.fromEntries(
      [...opts.referencesTo.values()]
        .flat()
        .map((r) => r.fileUri)
        .filter((uri): uri is string => Boolean(uri))
        .map((uri) => [uri, symbolTableFor(uri)]),
    );

  return {
    findSymbolsInFile: jest.fn(
      async (uri: string) => opts.symbolsInFile[uri] ?? [],
    ),
    findReferencesTo: jest.fn(
      async (s: ApexSymbol) => opts.referencesTo.get(s.name) ?? [],
    ),
    getSymbolTableForFile: jest.fn(async (uri: string) => symbolTables[uri]),
  } as unknown as ISymbolManager;
}

describe('resolveDependentUris', () => {
  it('returns serialized symbol tables for files that reference symbols declared in the target', async () => {
    // A declares Foo; B and C reference Foo; D unrelated.
    const foo = symbol('Foo', FILE_A);
    const manager = makeManager({
      symbolsInFile: { [FILE_A]: [foo] },
      referencesTo: new Map([['Foo', [reference(FILE_B), reference(FILE_C)]]]),
    });

    const result = await resolveDependentUris(manager, FILE_A);

    expect(Object.keys(result.entries).sort()).toEqual([FILE_B, FILE_C]);
    expect(result.entries[FILE_B].fileUri).toBe(FILE_B);
    expect(result.entries[FILE_C].fileUri).toBe(FILE_C);
    expect(result.entries[FILE_D]).toBeUndefined();
  });

  it('honors optional symbolName narrowing', async () => {
    // A declares Foo and Bar; B references Foo, C references Bar.
    const foo = symbol('Foo', FILE_A);
    const bar = symbol('Bar', FILE_A);
    const manager = makeManager({
      symbolsInFile: { [FILE_A]: [foo, bar] },
      referencesTo: new Map([
        ['Foo', [reference(FILE_B)]],
        ['Bar', [reference(FILE_C)]],
      ]),
    });

    const narrowed = await resolveDependentUris(manager, FILE_A, 'Foo');

    expect(Object.keys(narrowed.entries)).toEqual([FILE_B]);
    // findReferencesTo should only have been called for Foo.
    expect(manager.findReferencesTo).toHaveBeenCalledTimes(1);
    expect((manager.findReferencesTo as jest.Mock).mock.calls[0][0].name).toBe(
      'Foo',
    );
  });

  it('dedups dependent file URIs across multiple declared symbols', async () => {
    // A declares Foo and Bar; B references both.
    const foo = symbol('Foo', FILE_A);
    const bar = symbol('Bar', FILE_A);
    const manager = makeManager({
      symbolsInFile: { [FILE_A]: [foo, bar] },
      referencesTo: new Map([
        ['Foo', [reference(FILE_B)]],
        ['Bar', [reference(FILE_B)]],
      ]),
    });

    const result = await resolveDependentUris(manager, FILE_A);

    expect(Object.keys(result.entries)).toEqual([FILE_B]);
  });

  it('excludes self-references — caller already owns the target file table', async () => {
    // Symbol declared in A, referenced from A itself.
    const foo = symbol('Foo', FILE_A);
    const manager = makeManager({
      symbolsInFile: { [FILE_A]: [foo] },
      referencesTo: new Map([['Foo', [reference(FILE_A), reference(FILE_B)]]]),
    });

    const result = await resolveDependentUris(manager, FILE_A);

    expect(Object.keys(result.entries)).toEqual([FILE_B]);
    expect(result.entries[FILE_A]).toBeUndefined();
  });

  it('excludes self-references when caller URI is LSP-shaped and graph URI is unprotocoled', async () => {
    // Realistic asymmetry: caller passes the LSP-shaped URI; the symbol
    // graph stores source URIs without the file:// prefix (mirroring the
    // ApexSymbolRefManager normalization). The strict === filter would
    // miss this; the normalized comparison must catch it.
    const lspUri = 'file:///workspace/A.cls';
    const pathUri = '/workspace/A.cls';
    const foo = symbol('Foo', lspUri);
    const manager = makeManager({
      symbolsInFile: { [lspUri]: [foo] },
      referencesTo: new Map([['Foo', [reference(pathUri), reference(FILE_B)]]]),
    });

    const result = await resolveDependentUris(manager, lspUri);

    expect(Object.keys(result.entries)).toEqual([FILE_B]);
    expect(result.entries[pathUri]).toBeUndefined();
  });

  it('skips dependents whose symbol table is missing on this data-owner', async () => {
    const foo = symbol('Foo', FILE_A);
    const manager = makeManager({
      symbolsInFile: { [FILE_A]: [foo] },
      referencesTo: new Map([['Foo', [reference(FILE_B), reference(FILE_C)]]]),
      symbolTables: {
        // B's table is loaded; C's is not (missing — e.g., not yet ingested
        // here, will be served by another data-owner via QuerySymbolByName
        // in story 6.12).
        [FILE_B]: symbolTableFor(FILE_B),
      },
    });

    const result = await resolveDependentUris(manager, FILE_A);

    expect(Object.keys(result.entries)).toEqual([FILE_B]);
  });

  it('returns empty entries when target file has no declared symbols', async () => {
    const manager = makeManager({
      symbolsInFile: {},
      referencesTo: new Map(),
    });

    const result = await resolveDependentUris(manager, FILE_D);

    expect(result.entries).toEqual({});
  });
});
