/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect, LogLevel } from 'effect';
import {
  ApexSymbolManager,
  CompilerService,
  FullSymbolCollectorListener,
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
  completionResultForWire,
  makeWorkerDocument,
  loadCodeLensSymbolData,
  loadSymbolDataForEnrichment,
  prepareLspRequestCursor,
  preloadStandardNamespaces,
  writeBackEnrichedSymbols,
  targetSymbolForCursor,
  declaringFileForCursorSymbol,
  declarationLocationForCursor,
  dependencyReferencesAtCursor,
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
  describe('cursor dependency reference selection', () => {
    const reference = (
      name: string,
      startColumn: number,
      endColumn: number,
    ) => ({
      name,
      context: 5,
      location: {
        identifierRange: {
          startLine: 3,
          startColumn,
          endLine: 3,
          endColumn,
        },
      },
    });

    it('selects the exact token without admitting an adjacent reference', () => {
      const left = reference('left', 2, 6);
      const right = reference('right', 8, 13);
      const overlapping = reference('overlapping', 0, 20);

      expect(
        dependencyReferencesAtCursor([left, overlapping, right], {
          line: 3,
          character: 9,
        }),
      ).toEqual([right]);
      expect(
        dependencyReferencesAtCursor([left, right], {
          line: 3,
          character: 7,
        }),
      ).toEqual([]);
    });

    it('selects an incomplete member through its parser-owned operator range', () => {
      const receiver = {
        ...reference('property', 2, 10),
        semanticContext: {
          memberAccess: {
            operatorRange: {
              startLine: 3,
              startColumn: 10,
              endLine: 3,
              endColumn: 11,
            },
            incomplete: true,
          },
        },
      };

      expect(
        dependencyReferencesAtCursor([receiver], {
          line: 3,
          character: 11,
        }),
      ).toEqual([receiver]);
    });
  });

  it('returns only the requested range from worker documents', () => {
    const document = makeWorkerDocument(
      'file:///Completion.cls',
      ['public class Completion {', '  void run() {', '    this.', '  }'].join(
        '\n',
      ),
    );

    expect(
      document.getText({
        start: { line: 2, character: 0 },
        end: { line: 2, character: 9 },
      }),
    ).toBe('    this.');
    expect(document.getText()).toContain('public class Completion');
  });

  it('preserves a semantic completion readiness result', () => {
    expect(completionResultForWire({ items: [], isIncomplete: false })).toEqual(
      { items: [], isIncomplete: false },
    );
  });

  it('preserves an incomplete semantic completion result', () => {
    expect(completionResultForWire({ items: [], isIncomplete: true })).toEqual({
      items: [],
      isIncomplete: true,
    });
  });

  it('preserves complete non-empty completion results', () => {
    const items = [{ label: 'Address__c' }];
    expect(completionResultForWire({ items, isIncomplete: false })).toEqual({
      items,
      isIncomplete: false,
    });
  });

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

  describe('find-references cursor identity', () => {
    const location = (startColumn: number, endColumn: number, line = 2) => ({
      symbolRange: {
        startLine: line,
        startColumn,
        endLine: line,
        endColumn,
      },
      identifierRange: {
        startLine: line,
        startColumn,
        endLine: line,
        endColumn,
      },
    });

    const symbol = (
      id: string,
      name: string,
      fileUri: string,
      options: {
        fqn?: string;
        namespace?: string;
        parentId?: string | null;
        kind?: string;
      } = {},
    ) => ({
      id,
      name,
      fileUri,
      fqn: options.fqn,
      namespace: options.namespace,
      parentId: options.parentId ?? null,
      kind: options.kind ?? 'class',
      location: location(4, 10, 1),
    });

    const services = (overrides: Record<string, unknown>) =>
      ({ symbolManager: overrides }) as unknown as Parameters<
        typeof targetSymbolForCursor
      >[0];

    it.each(['broad-first', 'exact-first'] as const)(
      'uses the exact resolved cursor reference independent of overlap order (%s)',
      async (order) => {
        const wrong = {
          name: 'WrongTarget',
          context: 4,
          location: location(0, 20),
        };
        const exact = {
          name: 'RightTarget',
          context: 4,
          resolvedSymbolId: 'right-id',
          location: location(8, 19),
        };
        const references =
          order === 'broad-first' ? [wrong, exact] : [exact, wrong];
        const right = symbol(
          'right-id',
          'RightTarget',
          'file:///right/RightTarget.cls',
        );
        const getSymbolAtPosition = jest.fn(async () =>
          symbol('wrong-id', 'WrongTarget', 'file:///wrong/WrongTarget.cls'),
        );
        const svc = services({
          getReferencesAtPosition: jest.fn(async () => references),
          getSymbol: jest.fn(async (id: string) =>
            id === 'right-id' ? right : null,
          ),
          getSymbolAtPosition,
          findSymbolByFQN: jest.fn(async () => null),
          findSymbolByName: jest.fn(async () => []),
        });
        const cursor = { line: 1, character: 10 };

        await expect(
          targetSymbolForCursor(svc, 'file:///cursor.cls', cursor),
        ).resolves.toEqual({ name: 'RightTarget', kind: 'class' });
        await expect(
          declaringFileForCursorSymbol(svc, 'file:///cursor.cls', cursor),
        ).resolves.toBe('file:///right/RightTarget.cls');
        await expect(
          declarationLocationForCursor(svc, 'file:///cursor.cls', cursor),
        ).resolves.toEqual({
          uri: 'file:///right/RightTarget.cls',
          identifierRange: location(4, 10, 1).identifierRange,
        });
        expect(getSymbolAtPosition).not.toHaveBeenCalled();
      },
    );

    it('uses an exact FQN instead of the first duplicate simple name', async () => {
      const nsOne = symbol('one', 'Widget', 'file:///ns-one/Widget.cls', {
        fqn: 'NsOne.Widget',
        namespace: 'NsOne',
      });
      const nsTwo = symbol('two', 'Widget', 'file:///ns-two/Widget.cls', {
        fqn: 'NsTwo.Widget',
        namespace: 'NsTwo',
      });
      const findSymbolByName = jest.fn(async () => [nsOne, nsTwo]);
      const svc = services({
        getReferencesAtPosition: jest.fn(async () => [
          {
            name: 'NsTwo.Widget',
            context: 4,
            location: location(8, 20),
          },
        ]),
        getSymbol: jest.fn(async () => null),
        getSymbolAtPosition: jest.fn(async () => nsOne),
        findSymbolByFQN: jest.fn(async (fqn: string) =>
          fqn === 'NsTwo.Widget' ? nsTwo : null,
        ),
        findSymbolByName,
      });
      const cursor = { line: 1, character: 12 };

      await expect(
        targetSymbolForCursor(svc, 'file:///cursor.cls', cursor),
      ).resolves.toEqual({ name: 'Widget', kind: 'class' });
      await expect(
        declaringFileForCursorSymbol(svc, 'file:///cursor.cls', cursor),
      ).resolves.toBe('file:///ns-two/Widget.cls');
      await expect(
        declarationLocationForCursor(svc, 'file:///cursor.cls', cursor),
      ).resolves.toEqual({
        uri: 'file:///ns-two/Widget.cls',
        identifierRange: location(4, 10, 1).identifierRange,
      });
      expect(findSymbolByName).not.toHaveBeenCalled();
    });

    it('uses the resolved receiver owner to disambiguate duplicate members', async () => {
      const receiver = {
        name: 'service',
        context: 4,
        resolvedTypeId: 'owner-two',
        location: location(2, 9),
      };
      const member = {
        name: 'run',
        context: 2,
        location: location(10, 13),
      };
      const chain = { ...member, chainNodes: [receiver, member] };
      const exact = {
        ...member,
        _originalChainedRef: chain,
        _chainNode: member,
      };
      const ownerOneMember = symbol(
        'run-one',
        'run',
        'file:///one/Service.cls',
        { parentId: 'owner-one', kind: 'method' },
      );
      const ownerTwoMember = symbol(
        'run-two',
        'run',
        'file:///two/Service.cls',
        { parentId: 'owner-two', kind: 'method' },
      );
      const svc = services({
        getReferencesAtPosition: jest.fn(async () => [exact]),
        getSymbol: jest.fn(async () => null),
        getSymbolAtPosition: jest.fn(async () => ownerOneMember),
        findSymbolByFQN: jest.fn(async () => null),
        findSymbolByName: jest.fn(async () => [ownerOneMember, ownerTwoMember]),
      });

      await expect(
        targetSymbolForCursor(svc, 'file:///cursor.cls', {
          line: 1,
          character: 11,
        }),
      ).resolves.toEqual({ name: 'run', kind: 'method' });
      await expect(
        declaringFileForCursorSymbol(svc, 'file:///cursor.cls', {
          line: 1,
          character: 11,
        }),
      ).resolves.toBe('file:///two/Service.cls');
    });

    it('preserves uncertainty for an unqualified duplicate simple name', async () => {
      const candidates = [
        symbol('one', 'Widget', 'file:///ns-one/Widget.cls', {
          namespace: 'NsOne',
        }),
        symbol('two', 'Widget', 'file:///ns-two/Widget.cls', {
          namespace: 'NsTwo',
        }),
      ];
      const svc = services({
        getReferencesAtPosition: jest.fn(async () => [
          { name: 'Widget', context: 4, location: location(8, 14) },
        ]),
        getSymbol: jest.fn(async () => null),
        getSymbolAtPosition: jest.fn(async () => candidates[0]),
        findSymbolByFQN: jest.fn(async () => null),
        findSymbolByName: jest.fn(async () => candidates),
      });
      const cursor = { line: 1, character: 10 };

      await expect(
        targetSymbolForCursor(svc, 'file:///cursor.cls', cursor),
      ).resolves.toBeNull();
      await expect(
        declaringFileForCursorSymbol(svc, 'file:///cursor.cls', cursor),
      ).resolves.toBeNull();
      await expect(
        declarationLocationForCursor(svc, 'file:///cursor.cls', cursor),
      ).resolves.toBeNull();
    });

    it('accepts a precise same-file declaration when its token also has a reference', async () => {
      const declaration = {
        ...symbol('local', 'Widget', 'file:///cursor.cls'),
        location: location(8, 14),
      };
      const svc = services({
        getReferencesAtPosition: jest.fn(async () => [
          { name: 'Widget', context: 4, location: location(8, 14) },
        ]),
        getSymbol: jest.fn(async () => null),
        getSymbolAtPosition: jest.fn(async () => declaration),
        findSymbolByFQN: jest.fn(async () => null),
        findSymbolByName: jest.fn(async () => []),
      });

      await expect(
        targetSymbolForCursor(svc, 'file:///cursor.cls', {
          line: 1,
          character: 10,
        }),
      ).resolves.toEqual({ name: 'Widget', kind: 'class' });
    });
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

  it('loads nested and qualified dependencies from the cursor receiver type', async () => {
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
        getSymbolTableForFile: jest.fn(async (fileUri: string) =>
          fileUri === 'file:///CursorTarget.cls' ? currentTable : undefined,
        ),
        getSymbol: jest.fn(async (id: string) =>
          currentTable?.getAllSymbols().find((symbol) => symbol.id === id),
        ),
        findSymbolByName: jest.fn(async (name: string) => {
          if (name === 'AmbiguousType') {
            return [
              { id: 'ambiguous-one', name, fileUri: 'file:///one.cls' },
              { id: 'ambiguous-two', name, fileUri: 'file:///two.cls' },
            ];
          }
          return (currentTable?.getAllSymbols() ?? []).filter(
            (symbol) => symbol.name.toLowerCase() === name.toLowerCase(),
          );
        }),
        findSymbolByFQN: jest.fn(async () => null),
        resolveCrossFileReferencesForFile: jest.fn(() => Effect.void),
      },
    } as unknown as Parameters<typeof prepareLspRequestCursor>[0];
    const content = [
      'public class CursorTarget {',
      '  public void run() {',
      '    Map<Ns.RelatedType, Map<NestedType, AmbiguousType>> selected;',
      '    UnrelatedType ignored;',
      '    selected.',
      '  }',
      '}',
    ].join('\n');

    await Effect.runPromise(
      prepareLspRequestCursor(
        svc,
        'hover',
        'file:///CursorTarget.cls',
        content,
        { line: 4, character: 13 },
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
      classNames: ['Ns.RelatedType', 'NestedType'],
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

  it('installs live edited content at the request version rather than the stale owner version', async () => {
    const uri = 'file:///ActiveEdit.cls';
    const initialContent = [
      'public class ActiveEdit {',
      '  public String oldField;',
      '}',
    ].join('\n');
    const editedContent = [
      'public class ActiveEdit {',
      '  public String newField;',
      '}',
    ].join('\n');
    const symbolManager = new ApexSymbolManager();
    const initialTable = new SymbolTable();
    new CompilerService().compile(
      initialContent,
      uri,
      new FullSymbolCollectorListener(initialTable),
      {},
    );
    await Effect.runPromise(symbolManager.addSymbolTable(initialTable, uri, 1));

    setAssistanceTransport(async (method) => {
      if (method === 'dataOwner:QuerySymbolSubset') {
        return {
          entries: {},
          versions: { [uri]: 1 },
          detailLevels: { [uri]: 'public-api' },
        };
      }
      return { entries: {} };
    });
    const svc = {
      storageManager: {
        getStorage: () => ({ setDocument: jest.fn() }),
      },
      symbolManager,
    } as unknown as Parameters<typeof prepareLspRequestCursor>[0];

    const prepared = await Effect.runPromise(
      prepareLspRequestCursor(
        svc,
        'hover',
        uri,
        editedContent,
        { line: 1, character: 20 },
        2,
      ),
    );
    const currentTable = await symbolManager.getSymbolTableForFile(uri);
    const names = currentTable?.getAllSymbols().map((symbol) => symbol.name);

    expect(prepared.documentVersion).toBe(2);
    expect(currentTable?.getMetadata().documentVersion).toBe(2);
    expect(names).toContain('newField');
    expect(names).not.toContain('oldField');
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
