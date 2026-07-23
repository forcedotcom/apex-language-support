/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect, LogLevel } from 'effect';
import {
  CompilerService,
  SymbolTable,
  VisibilitySymbolListener,
} from '@salesforce/apex-lsp-parser-ast';
import {
  cloneForWire,
  setWorkerLogLevel,
  currentWorkerLogLevel,
  effectLogLevelToWire,
  setAssistanceTransport,
  requestCoordinatorAssistancePromiseShared,
  setWorkerId,
  workerId,
  resolveMissingNamesViaDataOwner,
  loadCodeLensSymbolData,
  loadSymbolDataForEnrichment,
  prepareLspRequestCursor,
  preloadStandardNamespaces,
  writeBackEnrichedSymbols,
} from '../../src/worker.platform.shared';

const compileToWireSymbolTable = (content: string, uri: string): unknown => {
  const table = new SymbolTable();
  const listener = new VisibilitySymbolListener('public-api', table);
  const result = new CompilerService().compile(content, uri, listener, {
    collectReferences: true,
    resolveReferences: true,
  });
  const compiled =
    result?.result instanceof SymbolTable ? result.result : table;
  return JSON.parse(
    JSON.stringify({
      symbols: compiled.getAllSymbols(),
      references: compiled.getAllReferences(),
      hierarchicalReferences: compiled.getAllHierarchicalReferences(),
      metadata: compiled.getMetadata(),
      fileUri: compiled.getFileUri(),
    }),
  );
};

describe('worker.platform.shared', () => {
  it('cloneForWire deep-clones and drops functions', () => {
    const input = { a: 1, fn: () => null };
    const result = cloneForWire(input) as { a: number; fn?: unknown };
    expect(result).toEqual({ a: 1 });
    expect(result.fn).toBeUndefined();
  });

  it('cloneForWire returns null for null/undefined', () => {
    expect(cloneForWire(null)).toBeNull();
    expect(cloneForWire(undefined)).toBeNull();
  });

  it('setWorkerLogLevel only accepts known levels', () => {
    setWorkerLogLevel('debug');
    expect(currentWorkerLogLevel).toBe('debug');
    setWorkerLogLevel('not-a-level');
    expect(currentWorkerLogLevel).toBe('debug'); // unchanged
    setWorkerLogLevel('error');
  });

  it('effectLogLevelToWire maps Effect levels to wire levels', () => {
    expect(effectLogLevelToWire(LogLevel.Error)).toBe('error');
    expect(effectLogLevelToWire(LogLevel.Warning)).toBe('warning');
    expect(effectLogLevelToWire(LogLevel.Info)).toBe('info');
    expect(effectLogLevelToWire(LogLevel.Debug)).toBe('debug');
    // Below Debug (e.g. Trace) has no wire-level mapping.
    expect(effectLogLevelToWire(LogLevel.Trace)).toBeNull();
  });

  it('setAssistanceTransport wires the shim through to callers', async () => {
    setAssistanceTransport(async (method, params) => ({ method, params }));
    const result = await requestCoordinatorAssistancePromiseShared(
      'test:Method',
      { x: 1 },
      false,
    );
    expect(result).toEqual({ method: 'test:Method', params: { x: 1 } });
  });

  it('setWorkerId updates the shared workerId binding', () => {
    setWorkerId('worker-test-123');
    expect(workerId).toBe('worker-test-123');
  });

  it('resolveMissingNamesViaDataOwner resolves via the injected transport', async () => {
    setAssistanceTransport(async () => ({ entries: {} }));
    const svc = {
      symbolManager: {
        addSymbolTable: () => Promise.resolve(),
        // findSymbolByName is consulted first (local-index skip) before any
        // transport round-trip; an empty match keeps the name in the
        // residual set so the transport call below is actually exercised.
        findSymbolByName: () => Promise.resolve([]),
      },
    } as unknown as Parameters<typeof resolveMissingNamesViaDataOwner>[0];
    const count = await resolveMissingNamesViaDataOwner(svc, ['Foo']);
    expect(typeof count).toBe('number');
  });

  it('preloads configured stdlib namespaces through DataOwner services', async () => {
    const assistance = jest.fn(async () => ({
      'database/batchable.cls': compileToWireSymbolTable(
        'global class Batchable {}',
        'apexlib://resources/StandardApexLibrary/database/batchable.cls',
      ),
      'system/assert.cls': compileToWireSymbolTable(
        'global class Assert {}',
        'apexlib://resources/StandardApexLibrary/system/assert.cls',
      ),
      'system/missing.cls': null,
    }));
    setAssistanceTransport(assistance);
    const addSymbolTable = jest.fn(() => Effect.void);
    const svc = {
      stdlibProvider: {
        getStandardNamespaces: () =>
          new Map([
            ['database', ['batchable.cls']],
            ['system', ['assert.cls', 'missing.cls', 'metadata.json']],
          ]),
      },
      symbolManager: { addSymbolTable },
    } as unknown as Parameters<typeof preloadStandardNamespaces>[0];

    const result = await preloadStandardNamespaces(svc, [
      'Database',
      'SYSTEM',
      'Unknown',
    ]);

    expect(assistance).toHaveBeenCalledTimes(1);
    expect(assistance).toHaveBeenCalledWith(
      'resourceLoader:getSymbolTables',
      {
        classPaths: [
          'database/batchable.cls',
          'system/assert.cls',
          'system/missing.cls',
        ],
      },
      true,
    );
    expect(addSymbolTable).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      namespaces: ['database', 'system'],
      loadedClasses: 2,
      totalClasses: 3,
      missingNamespaces: ['Unknown'],
      failedClasses: ['system.missing'],
    });
  });

  it('expands wildcard stdlib preloading without duplicating namespaces', async () => {
    setAssistanceTransport(async () => ({
      'Database/Batchable.cls': compileToWireSymbolTable(
        'global class Batchable {}',
        'apexlib://resources/StandardApexLibrary/Database/Batchable.cls',
      ),
      'System/Assert.cls': compileToWireSymbolTable(
        'global class Assert {}',
        'apexlib://resources/StandardApexLibrary/System/Assert.cls',
      ),
    }));
    const addSymbolTable = jest.fn(() => Effect.void);
    const svc = {
      stdlibProvider: {
        getStandardNamespaces: () =>
          new Map([
            ['Database', ['Batchable.cls']],
            ['System', ['Assert.cls']],
          ]),
      },
      symbolManager: { addSymbolTable },
    } as unknown as Parameters<typeof preloadStandardNamespaces>[0];

    const result = await preloadStandardNamespaces(svc, ['*', 'System']);

    expect(result.namespaces).toEqual(['Database', 'System']);
    expect(result.loadedClasses).toBe(2);
    expect(addSymbolTable).toHaveBeenCalledTimes(2);
  });

  it('degrades gracefully when symbol-subset assistance rejects', async () => {
    setAssistanceTransport(async () => {
      throw new Error('assistance unavailable');
    });
    const svc = {
      storageManager: { getStorage: () => ({ setDocument: jest.fn() }) },
      symbolManager: {},
    } as unknown as Parameters<typeof loadSymbolDataForEnrichment>[0];

    await expect(
      Effect.runPromise(loadSymbolDataForEnrichment(svc, 'file:///Broken.cls')),
    ).resolves.toEqual({ version: -1, detailLevel: 'public-api' });
  });

  it('preserves empty live document content in worker storage', async () => {
    setAssistanceTransport(async () => ({
      entries: {},
      versions: {},
      detailLevels: {},
    }));
    const setDocument = jest.fn();
    const svc = {
      storageManager: { getStorage: () => ({ setDocument }) },
      symbolManager: {},
    } as unknown as Parameters<typeof loadSymbolDataForEnrichment>[0];

    await Effect.runPromise(
      loadSymbolDataForEnrichment(svc, 'file:///Empty.cls', ''),
    );

    expect(setDocument).toHaveBeenCalledTimes(1);
    expect(setDocument.mock.calls[0][1].getText()).toBe('');
  });

  it('loads Code Lens symbols without dependency or cross-file preparation', async () => {
    const uri = 'file:///CodeLensTarget.cls';
    const wireTable = compileToWireSymbolTable(
      'public class CodeLensTarget { RelatedType value; }',
      uri,
    );
    const assistance = jest.fn(async (method: string) => {
      if (method === 'dataOwner:QuerySymbolSubset') {
        return {
          entries: { [uri]: wireTable },
          versions: { [uri]: 1 },
          detailLevels: { [uri]: 'public-api' },
        };
      }
      return { entries: {} };
    });
    setAssistanceTransport(assistance);

    const resolveCrossFileReferencesForFile = jest.fn(() => Effect.void);
    const svc = {
      symbolManager: {
        addSymbolTable: jest.fn(() => Effect.void),
        resolveCrossFileReferencesForFile,
      },
    } as unknown as Parameters<typeof loadCodeLensSymbolData>[0];

    await Effect.runPromise(loadCodeLensSymbolData(svc, uri));

    expect(
      assistance.mock.calls.filter(
        ([method]) => method === 'dataOwner:QuerySymbolSubset',
      ),
    ).toHaveLength(1);
    expect(
      assistance.mock.calls.filter(
        ([method]) => method === 'dataOwner:ResolveDepUris',
      ),
    ).toHaveLength(0);
    expect(resolveCrossFileReferencesForFile).not.toHaveBeenCalled();
  });

  it('reuses cursor preparation across different request types', async () => {
    setAssistanceTransport(async () => ({
      entries: {},
      versions: {},
      detailLevels: {},
    }));
    let currentTable: unknown;
    const addSymbolTable = jest.fn((table: unknown) => {
      currentTable = table;
      return Effect.void;
    });
    const svc = {
      storageManager: {
        getStorage: () => ({ setDocument: jest.fn() }),
      },
      symbolManager: {
        addSymbolTable,
        getSymbolTableForFile: jest.fn(async () => currentTable),
        resolveCrossFileReferencesForFile: jest.fn(() => Effect.void),
      },
    } as unknown as Parameters<typeof prepareLspRequestCursor>[0];
    const content = 'public class SharedCursor {}';

    const hover = await Effect.runPromise(
      prepareLspRequestCursor(
        svc,
        'hover',
        'file:///SharedCursor.cls',
        content,
      ),
    );
    const completion = await Effect.runPromise(
      prepareLspRequestCursor(
        svc,
        'completion',
        'file:///SharedCursor.cls',
        content,
      ),
    );

    expect(hover.cacheHit).toBe(false);
    expect(completion.cacheHit).toBe(true);
    expect(hover.ready).toBe(true);
    expect(completion.ready).toBe(true);
    expect(addSymbolTable).toHaveBeenCalledTimes(1);
  });

  it('loads only the dependency referenced at the cursor', async () => {
    const assistance = jest.fn(async (method: string, _params: unknown) => {
      if (method === 'dataOwner:QuerySymbolSubset') {
        return { entries: {}, versions: {}, detailLevels: {} };
      }
      return { entries: {} };
    });
    setAssistanceTransport(assistance);

    type TestSymbol = { id: string; name: string };
    type TestTable = { getAllSymbols: () => TestSymbol[] };
    let currentTable: TestTable | undefined;
    const svc = {
      storageManager: {
        getStorage: () => ({ setDocument: jest.fn() }),
      },
      symbolManager: {
        addSymbolTable: jest.fn((table: TestTable) => {
          currentTable = table;
          return Effect.void;
        }),
        getSymbolTableForFile: jest.fn(async () => currentTable),
        getSymbol: jest.fn(async (id: string) =>
          currentTable?.getAllSymbols().find((symbol) => symbol.id === id),
        ),
        findSymbolByName: jest.fn(async (name: string) =>
          (currentTable?.getAllSymbols() ?? []).filter(
            (symbol) => symbol.name.toLowerCase() === name.toLowerCase(),
          ),
        ),
        resolveCrossFileReferencesForFile: jest.fn(() => Effect.void),
      },
    } as unknown as Parameters<typeof prepareLspRequestCursor>[0];
    const content = [
      'public class CursorTarget {',
      '  public void run() {',
      '    RelatedType selected;',
      '    UnrelatedType ignored;',
      '  }',
      '}',
    ].join('\n');

    await Effect.runPromise(
      prepareLspRequestCursor(
        svc,
        'hover',
        'file:///CursorTarget.cls',
        content,
        { line: 2, character: 8 },
      ),
    );

    const dependencyRequests = assistance.mock.calls.filter(
      ([method]) => method === 'dataOwner:ResolveDepUris',
    );
    const symbolSubsetRequests = assistance.mock.calls.filter(
      ([method]) => method === 'dataOwner:QuerySymbolSubset',
    );
    expect(symbolSubsetRequests).toHaveLength(1);
    expect(symbolSubsetRequests[0][1]).toEqual({
      uris: ['file:///CursorTarget.cls'],
      includeEntries: false,
    });
    expect(dependencyRequests).toHaveLength(1);
    expect(dependencyRequests[0][1]).toEqual({
      classNames: ['RelatedType'],
    });
  });

  it('reuses a version-matched local cursor without querying the owner', async () => {
    const assistance = jest.fn(async (method: string, _params: unknown) => {
      if (method === 'dataOwner:QuerySymbolSubset') {
        return {
          entries: {},
          versions: { 'file:///CursorTarget.cls': 7 },
          detailLevels: {},
        };
      }
      return { entries: {} };
    });
    setAssistanceTransport(assistance);

    type TestSymbol = { id: string; name: string; fileUri: string };
    type TestTable = { getAllSymbols: () => TestSymbol[] };
    let currentTable: TestTable | undefined;
    const svc = {
      storageManager: {
        getStorage: () => ({ setDocument: jest.fn() }),
      },
      symbolManager: {
        addSymbolTable: jest.fn((table: TestTable) => {
          currentTable = table;
          return Effect.void;
        }),
        getSymbolTableForFile: jest.fn(async () => currentTable),
        getSymbol: jest.fn(async (id: string) =>
          currentTable?.getAllSymbols().find((symbol) => symbol.id === id),
        ),
        findSymbolByName: jest.fn(async (name: string) =>
          (currentTable?.getAllSymbols() ?? []).filter(
            (symbol) => symbol.name.toLowerCase() === name.toLowerCase(),
          ),
        ),
        resolveCrossFileReferencesForFile: jest.fn(() => Effect.void),
      },
    } as unknown as Parameters<typeof prepareLspRequestCursor>[0];
    const content = [
      'public class CursorTarget {',
      '  private class LocalType {}',
      '  public void run() {',
      '    LocalType selected;',
      '  }',
      '}',
    ].join('\n');

    await Effect.runPromise(
      prepareLspRequestCursor(
        svc,
        'definition',
        'file:///CursorTarget.cls',
        content,
        { line: 3, character: 8 },
        7,
      ),
    );

    const repeated = await Effect.runPromise(
      prepareLspRequestCursor(
        svc,
        'hover',
        'file:///CursorTarget.cls',
        content,
        { line: 3, character: 8 },
        7,
      ),
    );

    expect(
      assistance.mock.calls.filter(
        ([method]) => method === 'dataOwner:ResolveDepUris',
      ),
    ).toHaveLength(0);
    expect(repeated.cacheHit).toBe(true);
    expect(
      assistance.mock.calls.filter(
        ([method]) => method === 'dataOwner:QuerySymbolSubset',
      ),
    ).toHaveLength(1);

    await Effect.runPromise(
      prepareLspRequestCursor(
        svc,
        'hover',
        'file:///CursorTarget.cls',
        content,
        { line: 3, character: 8 },
        8,
      ),
    );
    expect(
      assistance.mock.calls.filter(
        ([method]) => method === 'dataOwner:QuerySymbolSubset',
      ),
    ).toHaveLength(2);
  });

  it('returns false when write-back assistance rejects', async () => {
    setAssistanceTransport(async () => {
      throw new Error('assistance unavailable');
    });
    const symbolTable = {
      getAllSymbols: () => [],
      getAllReferences: () => [],
      getAllHierarchicalReferences: () => [],
      getMetadata: () => ({}),
      getFileUri: () => 'file:///Broken.cls',
      getDetailLevel: () => 'full',
    };
    const svc = {
      symbolManager: {
        getSymbolTableForFile: async () => symbolTable,
      },
    } as unknown as Parameters<typeof writeBackEnrichedSymbols>[0];

    await expect(
      Effect.runPromise(
        writeBackEnrichedSymbols(svc, 'file:///Broken.cls', 1, 'full'),
      ),
    ).resolves.toBe(false);
  });

  it('rejects write-back when the table did not achieve the claimed detail', async () => {
    const assistance = jest.fn(async () => ({ accepted: true }));
    setAssistanceTransport(assistance);
    const symbolTable = {
      getAllSymbols: () => [],
      getAllReferences: () => [],
      getAllHierarchicalReferences: () => [],
      getMetadata: () => ({}),
      getFileUri: () => 'file:///Partial.cls',
      getDetailLevel: () => 'public-api',
    };
    const svc = {
      symbolManager: {
        getSymbolTableForFile: async () => symbolTable,
      },
    } as unknown as Parameters<typeof writeBackEnrichedSymbols>[0];

    await expect(
      Effect.runPromise(
        writeBackEnrichedSymbols(svc, 'file:///Partial.cls', 1, 'full'),
      ),
    ).resolves.toBe(false);
    expect(assistance).not.toHaveBeenCalled();
  });
});
