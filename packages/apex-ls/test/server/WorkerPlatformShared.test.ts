/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { vi } from 'vitest';
import {
  DefinitionProcessingService,
  HoverProcessingService,
} from '@salesforce/apex-lsp-compliant-services';
import { getLogger } from '@salesforce/apex-lsp-shared';
import { Effect, LogLevel } from 'effect';
import {
  ApexSymbolManager,
  CompilerService,
  FullSymbolCollectorListener,
  ResourceLoader,
  ReferenceContext,
  SymbolKind,
  composeSObjectSymbolTable,
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
  processSemanticTokensRequest,
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
  describe('processSemanticTokensRequest', () => {
    it('stores the live buffer before parser-only token processing', async () => {
      const uri = 'file:///Tokens.cls';
      const content = 'public class Tokens {}';
      const setDocument = vi.fn();
      const processSemanticTokens = vi.fn(async (requestedUri: string) => {
        expect(requestedUri).toBe(uri);
        expect(setDocument).toHaveBeenCalledOnce();
        const document = setDocument.mock.calls[0][1] as {
          getText(): string;
        };
        expect(document.getText()).toBe(content);
        return { data: [0, 0, 6, 0, 0] };
      });
      const svc = {
        storageManager: { getStorage: () => ({ setDocument }) },
        semanticTokensService: { processSemanticTokens },
      } as unknown as Parameters<typeof processSemanticTokensRequest>[0];

      await expect(
        Effect.runPromise(
          processSemanticTokensRequest(svc, {
            textDocument: { uri },
            content,
            semanticTokenLegend: {
              tokenTypes: ['class'],
              tokenModifiers: ['declaration'],
            },
          }),
        ),
      ).resolves.toEqual({ data: [0, 0, 6, 0, 0] });
      expect(processSemanticTokens).toHaveBeenCalledWith(uri, {
        tokenTypes: ['class'],
        tokenModifiers: ['declaration'],
      });
    });
  });

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
        const getSymbolAtPosition = vi.fn(async () =>
          symbol('wrong-id', 'WrongTarget', 'file:///wrong/WrongTarget.cls'),
        );
        const svc = services({
          getReferencesAtPosition: vi.fn(async () => references),
          getSymbol: vi.fn(async (id: string) =>
            id === 'right-id' ? right : null,
          ),
          getSymbolAtPosition,
          findSymbolByFQN: vi.fn(async () => null),
          findSymbolByName: vi.fn(async () => []),
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
      const findSymbolByName = vi.fn(async () => [nsOne, nsTwo]);
      const svc = services({
        getReferencesAtPosition: vi.fn(async () => [
          {
            name: 'NsTwo.Widget',
            context: 4,
            location: location(8, 20),
          },
        ]),
        getSymbol: vi.fn(async () => null),
        getSymbolAtPosition: vi.fn(async () => nsOne),
        findSymbolByFQN: vi.fn(async (fqn: string) =>
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
        getReferencesAtPosition: vi.fn(async () => [exact]),
        getSymbol: vi.fn(async () => null),
        getSymbolAtPosition: vi.fn(async () => ownerOneMember),
        findSymbolByFQN: vi.fn(async () => null),
        findSymbolByName: vi.fn(async () => [ownerOneMember, ownerTwoMember]),
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
        getReferencesAtPosition: vi.fn(async () => [
          { name: 'Widget', context: 4, location: location(8, 14) },
        ]),
        getSymbol: vi.fn(async () => null),
        getSymbolAtPosition: vi.fn(async () => candidates[0]),
        findSymbolByFQN: vi.fn(async () => null),
        findSymbolByName: vi.fn(async () => candidates),
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
        getReferencesAtPosition: vi.fn(async () => [
          { name: 'Widget', context: 4, location: location(8, 14) },
        ]),
        getSymbol: vi.fn(async () => null),
        getSymbolAtPosition: vi.fn(async () => declaration),
        findSymbolByFQN: vi.fn(async () => null),
        findSymbolByName: vi.fn(async () => []),
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
    const assistance = vi.fn(async () => ({
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
    const addSymbolTable = vi.fn(() => Effect.void);
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
    const addSymbolTable = vi.fn(() => Effect.void);
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
      storageManager: { getStorage: () => ({ setDocument: vi.fn() }) },
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
    const setDocument = vi.fn();
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
    const assistance = vi.fn(async (method: string, _params: unknown) => {
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

    const resolveCrossFileReferencesForFile = vi.fn(() => Effect.void);
    const svc = {
      symbolManager: {
        addSymbolTable: vi.fn(() => Effect.void),
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
    const addSymbolTable = vi.fn((table: unknown) => {
      currentTable = table;
      return Effect.void;
    });
    const svc = {
      storageManager: {
        getStorage: () => ({ setDocument: vi.fn() }),
      },
      symbolManager: {
        addSymbolTable,
        getSymbolTableForFile: vi.fn(async () => currentTable),
        resolveCrossFileReferencesForFile: vi.fn(() => Effect.void),
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
    const assistance = vi.fn(async (method: string, _params: unknown) => {
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
        getStorage: () => ({ setDocument: vi.fn() }),
      },
      symbolManager: {
        addSymbolTable: vi.fn((table: TestTable) => {
          currentTable = table;
          return Effect.void;
        }),
        getSymbolTableForFile: vi.fn(async (fileUri: string) =>
          fileUri === 'file:///CursorTarget.cls' ? currentTable : undefined,
        ),
        getSymbol: vi.fn(async (id: string) =>
          currentTable?.getAllSymbols().find((symbol) => symbol.id === id),
        ),
        findSymbolByName: vi.fn(async (name: string) => {
          if (name === 'AmbiguousType') {
            return [
              {
                id: 'ambiguous-one',
                name,
                kind: 'class',
                fileUri: 'file:///one.cls',
              },
              {
                id: 'ambiguous-two',
                name,
                kind: 'class',
                fileUri: 'file:///two.cls',
              },
            ];
          }
          return (currentTable?.getAllSymbols() ?? []).filter(
            (symbol) => symbol.name.toLowerCase() === name.toLowerCase(),
          );
        }),
        findSymbolByFQN: vi.fn(async () => null),
        resolveCrossFileReferencesForFile: vi.fn(() => Effect.void),
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

  it('requests an sObject candidate when a same-named Apex class is already local', async () => {
    const uri = 'file:///ContentVersionConsumer.cls';
    const standardClassUri = 'apexlib://resources/ContentVersion.cls';
    const assistance = vi.fn(async (method: string, _params: unknown) => {
      if (method === 'dataOwner:QuerySymbolSubset') {
        return { entries: {}, versions: {}, detailLevels: {} };
      }
      if (method === 'apex/findMissingArtifact') {
        return { status: 'not-found' };
      }
      return { entries: {} };
    });
    setAssistanceTransport(assistance);

    let currentTable: SymbolTable | undefined;
    const completeTable = {
      getMetadata: () => ({ parseCompleteness: 'complete' }),
    };
    const svc = {
      storageManager: {
        getStorage: () => ({ setDocument: vi.fn() }),
      },
      symbolManager: {
        addSymbolTable: vi.fn((table: SymbolTable) => {
          currentTable = table;
          return Effect.void;
        }),
        getSymbolTableForFile: vi.fn(async (fileUri: string) => {
          if (fileUri === uri) return currentTable;
          if (fileUri === standardClassUri) return completeTable;
          return undefined;
        }),
        getSymbol: vi.fn(async () => null),
        findSymbolByFQN: vi.fn(async () => null),
        findSymbolByName: vi.fn(async (name: string) =>
          name === 'ContentVersion'
            ? [
                {
                  id: 'standard-content-version',
                  name,
                  kind: 'class',
                  fileUri: standardClassUri,
                },
              ]
            : [],
        ),
        resolveCrossFileReferencesForFile: vi.fn(() => Effect.void),
      },
    } as unknown as Parameters<typeof prepareLspRequestCursor>[0];
    const content = [
      'public class ContentVersionConsumer {',
      '  void run() {',
      '    ContentVersion version;',
      '  }',
      '}',
    ].join('\n');

    await Effect.runPromise(
      prepareLspRequestCursor(svc, 'hover', uri, content, {
        line: 2,
        character: 6,
      }),
    );

    const artifactRequests = assistance.mock.calls.filter(
      ([method]) => method === 'apex/findMissingArtifact',
    );
    expect(artifactRequests).toHaveLength(1);
    expect(artifactRequests[0][1]).toMatchObject({
      identifiers: expect.arrayContaining([
        expect.objectContaining({
          name: 'ContentVersion',
          identifierType: 'sobject',
          allowSObjectPlaceholder: false,
        }),
      ]),
    });
  });

  it('requests a cold sObject candidate for a type and constructor hover', async () => {
    const uri = 'file:///ContentVersionConsumer.cls';
    const assistance = vi.fn(async (method: string, _params: unknown) => {
      if (method === 'dataOwner:QuerySymbolSubset') {
        return { entries: {}, versions: {}, detailLevels: {} };
      }
      if (method === 'apex/findMissingArtifact') {
        return { status: 'not-found' };
      }
      return { entries: {} };
    });
    setAssistanceTransport(assistance);

    let currentTable: SymbolTable | undefined;
    const svc = {
      storageManager: {
        getStorage: () => ({ setDocument: vi.fn() }),
      },
      symbolManager: {
        addSymbolTable: vi.fn((table: SymbolTable) => {
          currentTable = table;
          return Effect.void;
        }),
        getSymbolTableForFile: vi.fn(async (fileUri: string) =>
          fileUri === uri ? currentTable : undefined,
        ),
        getSymbol: vi.fn(async () => null),
        findSymbolByFQN: vi.fn(async () => null),
        findSymbolByName: vi.fn(async () => []),
        resolveCrossFileReferencesForFile: vi.fn(() => Effect.void),
      },
    } as unknown as Parameters<typeof prepareLspRequestCursor>[0];
    const content = [
      'public class ContentVersionConsumer {',
      '  void run() {',
      '    ContentVersion version = new ContentVersion();',
      '  }',
      '}',
    ].join('\n');

    await Effect.runPromise(
      prepareLspRequestCursor(svc, 'hover', uri, content, {
        line: 2,
        character: 6,
      }),
    );

    const artifactRequests = assistance.mock.calls.filter(
      ([method]) => method === 'apex/findMissingArtifact',
    );
    expect(artifactRequests).toHaveLength(1);
    expect(artifactRequests[0][1]).toMatchObject({
      identifiers: expect.arrayContaining([
        expect.objectContaining({
          name: 'ContentVersion',
          identifierType: 'sobject',
          allowSObjectPlaceholder: false,
        }),
      ]),
    });
  });

  it.each([
    ['child', 'file:///Wrapper.cls', 13],
    ['nested', 'file:///Child.cls', 19],
    ['total', 'file:///Grandchild.cls', 26],
  ] as const)(
    'loads cold multi-hop assignment dependencies for %s',
    async (member, ownerUri, character) => {
      const uri = 'file:///Caller.cls';
      const dependencySources = new Map([
        ['Wrapper', 'public class Wrapper { public Child child; }'],
        [
          'Child',
          'public class Child { public Grandchild nested; public Integer total; }',
        ],
        ['Grandchild', 'public class Grandchild { public Integer total; }'],
      ]);
      const assistance = vi.fn(async (method: string, params: unknown) => {
        if (method === 'dataOwner:ResolveDepUris') {
          const names = (params as { classNames: string[] }).classNames;
          return {
            entries: Object.fromEntries(
              names.flatMap((name) => {
                const source = dependencySources.get(name);
                return source
                  ? [
                      [
                        `file:///${name}.cls`,
                        compileToWireSymbolTable(source, `file:///${name}.cls`),
                      ],
                    ]
                  : [];
              }),
            ),
          };
        }
        if (method === 'dataOwner:QuerySymbolByName') {
          const names = (params as { names: string[] }).names;
          return {
            entries: Object.fromEntries(
              names.flatMap((name) => {
                const source = dependencySources.get(name);
                return source
                  ? [
                      [
                        `file:///${name}.cls`,
                        compileToWireSymbolTable(source, `file:///${name}.cls`),
                      ],
                    ]
                  : [];
              }),
            ),
          };
        }
        return { entries: {}, versions: {}, detailLevels: {} };
      });
      setAssistanceTransport(assistance);
      const symbolManager = new ApexSymbolManager();
      const svc = {
        storageManager: { getStorage: () => ({ setDocument: vi.fn() }) },
        symbolManager,
      } as unknown as Parameters<typeof prepareLspRequestCursor>[0];
      const source = [
        'public class Caller {',
        '  public Child child;',
        '  public Grandchild nested;',
        '  public Integer total;',
        '  void run(Wrapper receiver) {',
        '    receiver.child.nested.total = 1;',
        '  }',
        '}',
      ].join('\n');
      const position = { line: 5, character };

      try {
        await Effect.runPromise(
          prepareLspRequestCursor(svc, 'definition', uri, source, position),
        );
        const requestedNames = assistance.mock.calls
          .filter(([method]) => method === 'dataOwner:ResolveDepUris')
          .flatMap(
            ([, params]) => (params as { classNames: string[] }).classNames,
          );
        expect(requestedNames).toContain('Wrapper');
        expect(
          assistance.mock.calls.filter(
            ([method]) => method === 'apex/findMissingArtifact',
          ),
        ).toHaveLength(0);

        await expect(
          new DefinitionProcessingService(
            getLogger(),
            symbolManager,
          ).processDefinition(
            { textDocument: { uri }, position },
            { prerequisitesPrepared: true },
          ),
        ).resolves.toEqual([expect.objectContaining({ uri: ownerUri })]);
        await expect(
          symbolManager.getSymbolAtPosition(
            uri,
            { line: 6, character },
            'precise',
          ),
        ).resolves.toMatchObject({ name: member, fileUri: ownerUri });
        if (member === 'child') {
          expect(requestedNames).not.toContain('Child');
          expect(requestedNames).not.toContain('Grandchild');
        }
      } finally {
        symbolManager.clear();
      }
    },
  );

  it.each(['declaration-first', 'member-first'] as const)(
    'reconciles noSoqlEvidence semantic identity with loaded dependencies (%s)',
    async (order) => {
      const uri = 'file:///noSoqlEvidence.cls';
      const source = [
        'public class noSoqlEvidence {',
        '  void run() {',
        '    BusinessHours bh;',
        '    String n = bh.Name;',
        '    Boolean open = BusinessHours.isWithin(null, Datetime.now());',
        '  }',
        '}',
      ].join('\n');
      const loader = ResourceLoader.getInstance();
      await loader.initialize();
      const symbolManager = new ApexSymbolManager({
        isStdApexNamespace: (name) => loader.isStdApexNamespace(name),
        hasClass: (name) => loader.hasClass(name),
        findNamespaceForClass: (name) => loader.findNamespaceForClass(name),
        getStandardNamespaces: () =>
          new Map(
            [...loader.getStandardNamespaces()].map(([name, classes]) => [
              name,
              classes.map((value) => value.value),
            ]),
          ),
        resolveClassFqn: (name) =>
          Promise.resolve(loader.resolveStandardClassFqn(name)),
        getSymbolTable: (name) => loader.getSymbolTable(name),
        getFile: (name) => loader.getFile(name),
      });
      const standard =
        await symbolManager.resolveStandardApexClass('BusinessHours');
      expect(standard?.kind).toBe(SymbolKind.Class);
      const reconcile = vi.spyOn(
        symbolManager,
        'resolveCrossFileReferencesForFile',
      );
      const native = composeSObjectSymbolTable(
        {
          name: 'BusinessHours',
          custom: false,
          definitionTarget: { uri: 'org://BusinessHours' },
          fields: [
            {
              name: 'Name',
              type: 'string',
              definitionTarget: { uri: 'org://BusinessHours/Name' },
            },
          ],
        },
        1,
      );
      const assistance = vi.fn(async () => ({
        entries: {},
        versions: {},
        detailLevels: {},
      }));
      setAssistanceTransport(assistance);
      const svc = {
        storageManager: { getStorage: () => ({ setDocument: vi.fn() }) },
        symbolManager,
      } as unknown as Parameters<typeof prepareLspRequestCursor>[0];
      const declarationPosition = { line: 2, character: 6 };
      const memberPosition = { line: 3, character: 19 };
      const assertNative = async () => {
        const declared = await symbolManager.getSymbolAtPosition(
          uri,
          { line: 3, character: 6 },
          'precise',
        );
        expect(declared?.id).toBe(native.getRoots()[0].id);
        expect(declared?.kind).toBe(SymbolKind.SObject);
        const table = await symbolManager.getSymbolTableForFile(uri);
        expect(
          table
            ?.getAllReferences()
            .find(
              (reference) =>
                reference.context === ReferenceContext.TYPE_DECLARATION &&
                reference.name === 'BusinessHours',
            ),
        ).toMatchObject({
          resolvedSymbolId: native.getRoots()[0].id,
          isSObject: true,
        });
        const field = await symbolManager.getSymbolAtPosition(
          uri,
          { line: 4, character: 19 },
          'precise',
        );
        expect(field?.id).toBe(
          native.getAllSymbols().find((symbol) => symbol.name === 'Name')?.id,
        );
        expect(field?.kind).toBe(SymbolKind.Field);
      };
      const hover = async (position: { line: number; character: number }) => {
        await Effect.runPromise(
          prepareLspRequestCursor(svc, 'hover', uri, source, position),
        );
        const result = await new HoverProcessingService(
          getLogger(),
          symbolManager,
        ).processHover(
          { textDocument: { uri }, position },
          { prerequisitesPrepared: true },
        );
        expect(result).not.toBeNull();
        expect(JSON.stringify(result)).not.toContain('Searching for symbol');
      };
      try {
        // Warm the full cursor against stdlib before native metadata arrives.
        // The next hover must reconcile even though its type token is resolved
        // and both dependency tables are already local.
        await Effect.runPromise(
          prepareLspRequestCursor(svc, 'hover', uri, source, {
            line: 4,
            character: 37,
          }),
        );
        expect(reconcile).toHaveBeenCalledTimes(1);
        await hover({ line: 4, character: 37 });
        expect(reconcile).toHaveBeenCalledTimes(1);
        await Effect.runPromise(
          symbolManager.addSymbolTable(native, native.getFileUri(), 1),
        );
        await hover(
          order === 'declaration-first' ? declarationPosition : memberPosition,
        );
        // Resolve the declaration before selecting the field, so a member lookup cannot repair it.
        await assertNative();
        expect(reconcile).toHaveBeenCalledTimes(2);
        for (let repeat = 0; repeat < 3; repeat++) {
          await hover(declarationPosition);
          await hover(memberPosition);
          await assertNative();
          await hover({ line: 4, character: 37 });
          const staticReceiver = await symbolManager.getSymbolAtPosition(
            uri,
            { line: 5, character: 21 },
            'precise',
          );
          expect(staticReceiver?.id).toBe(standard?.id);
          const staticMethod = await symbolManager.getSymbolAtPosition(
            uri,
            { line: 5, character: 37 },
            'precise',
          );
          expect(staticMethod).toMatchObject({
            name: 'isWithin',
            kind: SymbolKind.Method,
            fileUri: standard?.fileUri,
          });
        }
        expect(reconcile).toHaveBeenCalledTimes(2);
        const updatedNative = composeSObjectSymbolTable(
          {
            name: 'BusinessHours',
            custom: false,
            definitionTarget: { uri: 'org://BusinessHours' },
            fields: [
              {
                name: 'Name',
                type: 'string',
                definitionTarget: { uri: 'org://BusinessHours/Name' },
              },
            ],
          },
          2,
        );
        await Effect.runPromise(
          symbolManager.addSymbolTable(updatedNative, native.getFileUri(), 2),
        );
        const resolve =
          ApexSymbolManager.prototype.resolveCrossFileReferencesForFile.bind(
            symbolManager,
          );
        reconcile.mockImplementation((fileUri) =>
          Effect.sleep('10 millis').pipe(Effect.zipRight(resolve(fileUri))),
        );
        await Promise.all([hover(declarationPosition), hover(memberPosition)]);
        expect(reconcile).toHaveBeenCalledTimes(3);
        await hover(memberPosition);
        expect(reconcile).toHaveBeenCalledTimes(3);
        // No-op and stale registrations must not invalidate completed work.
        const canonicalNative = await symbolManager.getSymbolTableForFile(
          native.getFileUri(),
        );
        await Effect.runPromise(
          symbolManager.addSymbolTable(
            canonicalNative!,
            native.getFileUri(),
            2,
          ),
        );
        await Effect.runPromise(
          symbolManager.addSymbolTable(native, native.getFileUri(), 1),
        );
        await hover(memberPosition);
        expect(reconcile).toHaveBeenCalledTimes(3);
      } finally {
        reconcile.mockRestore();
        symbolManager.clear();
      }
    },
  );

  it('reconciles a replacement cursor table after an outstanding URI pass before caching completion', async () => {
    const uri = 'file:///ReplacementRace.cls';
    const source = [
      'public class ReplacementRace {',
      '  void run(Dependency value) {}',
      '}',
    ].join('\n');
    const editedSource = source.replace('value', 'editedValue');
    const symbolManager = new ApexSymbolManager();
    const dependencyUri = 'file:///Dependency.cls';
    await Effect.runPromise(
      symbolManager.addSymbolTable(
        SymbolTable.fromSerializedData(
          compileToWireSymbolTable(
            'public class Dependency {}',
            dependencyUri,
          ) as Parameters<typeof SymbolTable.fromSerializedData>[0],
        ),
        dependencyUri,
      ),
    );
    setAssistanceTransport(async () => ({
      entries: {},
      versions: {},
      detailLevels: {},
    }));
    const svc = {
      storageManager: { getStorage: () => ({ setDocument: vi.fn() }) },
      symbolManager,
    } as unknown as Parameters<typeof prepareLspRequestCursor>[0];
    const position = { line: 1, character: 13 };
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let firstStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      firstStarted = resolve;
    });
    let releaseReplacement!: () => void;
    const replacementGate = new Promise<void>((resolve) => {
      releaseReplacement = resolve;
    });
    let replacementStarted!: () => void;
    const replacementPassStarted = new Promise<void>((resolve) => {
      replacementStarted = resolve;
    });
    const processor = symbolManager as unknown as {
      processSymbolReferencesToGraphEffect(
        table: SymbolTable,
        fileUri: string,
      ): Effect.Effect<void>;
    };
    const process =
      processor.processSymbolReferencesToGraphEffect.bind(processor);
    const reconcile = vi.spyOn(
      symbolManager,
      'resolveCrossFileReferencesForFile',
    );
    const resolve =
      ApexSymbolManager.prototype.resolveCrossFileReferencesForFile.bind(
        symbolManager,
      );
    const processed: SymbolTable[] = [];
    const reconcilingTables = new Set<SymbolTable>();
    let firstTable: SymbolTable | null = null;
    let holdFirst = true;
    const processSpy = vi
      .spyOn(processor, 'processSymbolReferencesToGraphEffect')
      .mockImplementation((table, fileUri) =>
        Effect.gen(function* () {
          if (table === firstTable && holdFirst) {
            holdFirst = false;
            firstStarted();
            yield* Effect.promise(() => firstGate);
          } else if (reconcilingTables.has(table) && table !== firstTable) {
            replacementStarted();
            yield* Effect.promise(() => replacementGate);
          }
          yield* process(table, fileUri);
          processed.push(table);
        }),
      );
    reconcile.mockImplementation((fileUri) =>
      Effect.gen(function* () {
        const canonical = yield* Effect.promise(() =>
          symbolManager.getSymbolTableForFile(fileUri),
        );
        if (canonical) reconcilingTables.add(canonical);
        if (!firstTable) {
          firstTable = canonical ?? null;
        }
        yield* resolve(fileUri);
      }),
    );
    const hover = (content: string, version: number) =>
      Effect.runPromise(
        prepareLspRequestCursor(svc, 'hover', uri, content, position, version),
      );
    const first = hover(source, 1);
    let replacement: Promise<unknown> | undefined;
    let concurrentReplacement: Promise<unknown> | undefined;
    try {
      await started;
      let replacementFinished = false;
      replacement = hover(editedSource, 2).then((result) => {
        replacementFinished = true;
        return result;
      });
      await vi.waitFor(async () => {
        const canonical = await symbolManager.getSymbolTableForFile(uri);
        expect(canonical).not.toBe(firstTable);
        expect(canonical?.getMetadata().documentVersion).toBe(2);
      });
      const replacementTable = await symbolManager.getSymbolTableForFile(uri);
      // Let preparation reach reconciliation while A still owns the URI guard.
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(replacementFinished).toBe(false);
      processed.length = 0;
      releaseFirst();
      await replacementPassStarted;
      expect(processed).not.toContain(replacementTable);
      expect(replacementFinished).toBe(false);
      let concurrentFinished = false;
      concurrentReplacement = hover(editedSource, 2).then((result) => {
        concurrentFinished = true;
        return result;
      });
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(concurrentFinished).toBe(false);
      expect(reconcile).toHaveBeenCalledTimes(2);
      releaseReplacement();
      await Promise.all([first, replacement, concurrentReplacement]);
      expect(processed).toContain(replacementTable);
      expect(reconcile).toHaveBeenCalledTimes(2);
      await hover(editedSource, 2);
      expect(reconcile).toHaveBeenCalledTimes(2);
      expect(await symbolManager.getSymbolTableForFile(uri)).toBe(
        replacementTable,
      );
    } finally {
      releaseFirst();
      releaseReplacement();
      await Promise.all([first, replacement, concurrentReplacement]);
      processSpy.mockRestore();
      reconcile.mockRestore();
      symbolManager.clear();
    }
  });

  it('returns a cold hover for the nested assignment member', async () => {
    const uri = 'file:///Caller.cls';
    const dependencySources = new Map([
      ['Wrapper', 'public class Wrapper { public Child child; }'],
      [
        'Child',
        'public class Child { public Grandchild nested; public Integer total; }',
      ],
      ['Grandchild', 'public class Grandchild { public Integer total; }'],
    ]);
    setAssistanceTransport(async (method: string, params: unknown) => {
      if (method !== 'dataOwner:ResolveDepUris') {
        return { entries: {}, versions: {}, detailLevels: {} };
      }
      const names = (params as { classNames: string[] }).classNames;
      return {
        entries: Object.fromEntries(
          names.flatMap((name) => {
            const dependency = dependencySources.get(name);
            return dependency
              ? [
                  [
                    `file:///${name}.cls`,
                    compileToWireSymbolTable(dependency, `file:///${name}.cls`),
                  ],
                ]
              : [];
          }),
        ),
      };
    });
    const symbolManager = new ApexSymbolManager();
    const svc = {
      storageManager: { getStorage: () => ({ setDocument: vi.fn() }) },
      symbolManager,
    } as unknown as Parameters<typeof prepareLspRequestCursor>[0];
    const source = [
      'public class Caller {',
      '  public Child child;',
      '  public Grandchild nested;',
      '  public Integer total;',
      '  void run(Wrapper receiver) {',
      '    receiver.child.nested.total = 1;',
      '  }',
      '}',
    ].join('\n');
    const position = { line: 5, character: 19 };

    try {
      await Effect.runPromise(
        prepareLspRequestCursor(svc, 'hover', uri, source, position),
      );

      await expect(
        new HoverProcessingService(getLogger(), symbolManager).processHover(
          { textDocument: { uri }, position },
          { prerequisitesPrepared: true },
        ),
      ).resolves.toMatchObject({
        contents: {
          kind: 'markdown',
          value: expect.stringContaining('Grandchild Child.nested'),
        },
      });
    } finally {
      symbolManager.clear();
    }
  });

  it('asks the client to locate a missing workspace Apex dependency', async () => {
    const uri = 'file:///WorkspaceDependencyConsumer.cls';
    const assistance = vi.fn(async (method: string, _params: unknown) => {
      if (method === 'apex/findMissingArtifact') {
        return { opened: ['file:///WorkspaceDependency.cls'] };
      }
      return { entries: {}, versions: {}, detailLevels: {} };
    });
    setAssistanceTransport(assistance);
    const symbolManager = new ApexSymbolManager();
    const svc = {
      storageManager: { getStorage: () => ({ setDocument: vi.fn() }) },
      symbolManager,
    } as unknown as Parameters<typeof prepareLspRequestCursor>[0];
    const source = [
      'public class WorkspaceDependencyConsumer {',
      '  WorkspaceDependency value;',
      '}',
    ].join('\n');

    try {
      await Effect.runPromise(
        prepareLspRequestCursor(svc, 'hover', uri, source, {
          line: 1,
          character: 4,
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 0));

      const artifactRequest = assistance.mock.calls.find(
        ([method]) => method === 'apex/findMissingArtifact',
      );
      expect(
        (artifactRequest?.[1] as { identifiers: unknown[] }).identifiers,
      ).toContainEqual(
        expect.objectContaining({
          name: 'WorkspaceDependency',
          identifierType: 'apex-class',
        }),
      );
      expect(artifactRequest?.[1]).toMatchObject({
        origin: {
          uri,
          position: { line: 1, character: 4 },
          requestKind: 'hover',
        },
        mode: 'background',
      });
    } finally {
      symbolManager.clear();
    }
  });

  it('queues a cold static receiver for background artifact discovery', async () => {
    const uri = 'file:///StaticConsumer.cls';
    const assistance = vi.fn(async (method: string, _params: unknown) => {
      if (method === 'apex/findMissingArtifact') return { accepted: true };
      return { entries: {}, versions: {}, detailLevels: {} };
    });
    setAssistanceTransport(assistance);
    const symbolManager = new ApexSymbolManager();
    const svc = {
      storageManager: { getStorage: () => ({ setDocument: vi.fn() }) },
      symbolManager,
    } as unknown as Parameters<typeof prepareLspRequestCursor>[0];
    const source = [
      'public class StaticConsumer {',
      '  void run() {',
      '    MissingOwner.doWork();',
      '  }',
      '}',
    ].join('\n');

    try {
      await Effect.runPromise(
        prepareLspRequestCursor(svc, 'hover', uri, source, {
          line: 2,
          character: 18,
        }),
      );

      expect(assistance).toHaveBeenCalledWith(
        'apex/findMissingArtifact',
        expect.objectContaining({
          identifiers: expect.arrayContaining([
            expect.objectContaining({
              name: 'MissingOwner',
              identifierType: 'apex-class',
            }),
          ]),
          mode: 'background',
        }),
        true,
      );
    } finally {
      symbolManager.clear();
    }
  });

  it('progressively resolves a cold a.b.c.d hover after background indexing', async () => {
    const uri = 'file:///ColdCaller.cls';
    const dependencySources = new Map([
      ['Root', 'public class Root { public Middle b; }'],
      ['Middle', 'public class Middle { public Leaf c; }'],
      ['Leaf', 'public class Leaf { public Integer d; }'],
    ]);
    const requestedOwners: string[] = [];
    const assistance = vi.fn(async (method: string, params: unknown) => {
      if (method === 'dataOwner:ResolveDepUris') {
        // The request starts cold: no receiver owner is preloaded.
        return { entries: {} };
      }
      if (method === 'apex/findMissingArtifact') {
        const identifiers = (
          params as {
            identifiers: Array<{ name: string; identifierType: string }>;
          }
        ).identifiers;
        requestedOwners.push(
          ...identifiers
            .filter((identifier) => identifier.identifierType === 'apex-class')
            .map((identifier) => identifier.name),
        );
        return { accepted: true };
      }
      return { entries: {}, versions: {}, detailLevels: {} };
    });
    setAssistanceTransport(assistance);
    const symbolManager = new ApexSymbolManager();
    const svc = {
      storageManager: { getStorage: () => ({ setDocument: vi.fn() }) },
      symbolManager,
    } as unknown as Parameters<typeof prepareLspRequestCursor>[0];
    const source = [
      'public class ColdCaller {',
      '  void run(Root a) {',
      '    a.b.c.d = 1;',
      '  }',
      '}',
    ].join('\n');
    const position = { line: 2, character: 10 };
    const processHover = () =>
      new HoverProcessingService(getLogger(), symbolManager).processHover(
        { textDocument: { uri }, position },
        { prerequisitesPrepared: true },
      );
    const indexOwner = async (name: string) => {
      const ownerUri = `file:///${name}.cls`;
      await Effect.runPromise(
        symbolManager.addSymbolTable(
          SymbolTable.fromSerializedData(
            compileToWireSymbolTable(
              dependencySources.get(name)!,
              ownerUri,
            ) as Parameters<typeof SymbolTable.fromSerializedData>[0],
          ),
          ownerUri,
        ),
      );
    };

    try {
      await Effect.runPromise(
        prepareLspRequestCursor(svc, 'hover', uri, source, position),
      );
      await expect(processHover()).resolves.toMatchObject({
        contents: {
          kind: 'markdown',
          value: expect.stringContaining('Searching'),
        },
      });
      expect(requestedOwners).toEqual(['Root']);

      await indexOwner('Root');
      await Effect.runPromise(
        prepareLspRequestCursor(svc, 'hover', uri, source, position),
      );
      await expect(processHover()).resolves.toMatchObject({
        contents: {
          kind: 'markdown',
          value: expect.stringContaining('Searching'),
        },
      });
      expect(requestedOwners).toEqual(['Root', 'Middle']);

      await indexOwner('Middle');
      await Effect.runPromise(
        prepareLspRequestCursor(svc, 'hover', uri, source, position),
      );
      await expect(processHover()).resolves.toMatchObject({
        contents: {
          kind: 'markdown',
          value: expect.stringContaining('Searching'),
        },
      });
      expect(requestedOwners).toEqual(['Root', 'Middle', 'Leaf']);

      await indexOwner('Leaf');
      await Effect.runPromise(
        prepareLspRequestCursor(svc, 'hover', uri, source, position),
      );
      await expect(processHover()).resolves.toMatchObject({
        contents: {
          kind: 'markdown',
          value: expect.stringContaining('Integer Leaf.d'),
        },
      });
    } finally {
      symbolManager.clear();
    }
  });

  it.each([
    ['apexlib://resources/ContentVersion.cls', true],
    ['file:///ContentVersion.cls', false],
  ])(
    'handles a cold VersionData definition without overriding %s',
    async (classUri, resolvesSObject) => {
      const uri = 'file:///ContentVersionReceiver.cls';
      const fieldUri =
        'file:///objects/ContentVersion/fields/VersionData.field-meta.xml';
      const symbolManager = new ApexSymbolManager();
      const listener = new FullSymbolCollectorListener();
      new CompilerService().compile(
        'public class ContentVersion {}',
        classUri,
        listener,
      );
      await Effect.runPromise(
        symbolManager.addSymbolTable(listener.getResult(), classUri),
      );
      const assistance = vi.fn(async (method: string, _params: unknown) => {
        if (method === 'apex/findMissingArtifact') {
          return {
            artifacts: [
              {
                identifierType: 'sobject',
                name: 'ContentVersion',
                describe: {
                  name: 'ContentVersion',
                  custom: false,
                  definitionTarget: {
                    uri: 'file:///objects/ContentVersion/ContentVersion.object-meta.xml',
                  },
                  fields: [
                    {
                      name: 'VersionData',
                      type: 'base64',
                      definitionTarget: { uri: fieldUri },
                    },
                  ],
                },
              },
            ],
          };
        }
        return { entries: {}, versions: {}, detailLevels: {} };
      });
      setAssistanceTransport(assistance);
      const svc = {
        storageManager: { getStorage: () => ({ setDocument: vi.fn() }) },
        symbolManager,
      } as unknown as Parameters<typeof prepareLspRequestCursor>[0];
      const source = [
        'public class ContentVersionReceiver {',
        '  public void run(String base64data) {',
        '    ContentVersion contentVersion = new ContentVersion();',
        '    contentVersion.VersionData = EncodingUtil.base64Decode(base64data);',
        '  }',
        '}',
      ].join('\n');
      const position = { line: 3, character: 20 };
      try {
        const prepared = await Effect.runPromise(
          prepareLspRequestCursor(svc, 'definition', uri, source, position),
        );
        expect(prepared.ready).toBe(true);
        const references = await symbolManager.getReferencesAtPosition(uri, {
          line: 4,
          character: 20,
        });
        expect(
          references.some((reference) => reference.name === 'VersionData'),
        ).toBe(true);
        const definition = await new DefinitionProcessingService(
          getLogger(),
          symbolManager,
        ).processDefinition(
          { textDocument: { uri }, position },
          { prerequisitesPrepared: true },
        );
        expect(definition).toEqual(
          resolvesSObject ? [expect.objectContaining({ uri: fieldUri })] : [],
        );
        const symbol = await symbolManager.getSymbolAtPosition(
          uri,
          { line: 4, character: 20 },
          'precise',
        );
        if (resolvesSObject)
          expect(symbol).toMatchObject({ name: 'VersionData', kind: 'field' });
        else expect(symbol).toBeNull();
        expect(assistance).toHaveBeenCalledWith(
          'apex/findMissingArtifact',
          expect.objectContaining({
            identifiers: [
              expect.objectContaining({
                name: 'ContentVersion',
                identifierType: 'sobject',
                allowSObjectPlaceholder: false,
              }),
            ],
            origin: { uri, position, requestKind: 'definition' },
          }),
          true,
        );
      } finally {
        symbolManager.clear();
      }
    },
  );

  it('requests a dependency despite multiple same-named non-type candidates', async () => {
    const uri = 'file:///NonTypeCandidates.cls';
    const symbolManager = new ApexSymbolManager();
    const assistance = vi.fn(async () => ({
      entries: {},
      versions: {},
      detailLevels: {},
    }));
    setAssistanceTransport(assistance);
    const svc = {
      storageManager: { getStorage: () => ({ setDocument: vi.fn() }) },
      symbolManager,
    } as unknown as Parameters<typeof prepareLspRequestCursor>[0];
    try {
      await Effect.runPromise(
        prepareLspRequestCursor(
          svc,
          'hover',
          uri,
          [
            'public class NonTypeCandidates {',
            '  void first(ExternalType externalType) {}',
            '  void second(ExternalType externalType) {}',
            '}',
          ].join('\n'),
          { line: 1, character: 15 },
        ),
      );
      expect(await symbolManager.findSymbolByName('ExternalType')).toHaveLength(
        2,
      );
      expect(assistance).toHaveBeenCalledWith(
        'dataOwner:ResolveDepUris',
        { classNames: ['ExternalType'] },
        true,
      );
    } finally {
      symbolManager.clear();
    }
  });

  it('reuses a version-matched local cursor without querying the owner', async () => {
    const assistance = vi.fn(async (method: string, _params: unknown) => {
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
        getStorage: () => ({ setDocument: vi.fn() }),
      },
      symbolManager: {
        addSymbolTable: vi.fn((table: TestTable) => {
          currentTable = table;
          return Effect.void;
        }),
        getSymbolTableForFile: vi.fn(async () => currentTable),
        getSymbol: vi.fn(async (id: string) =>
          currentTable?.getAllSymbols().find((symbol) => symbol.id === id),
        ),
        findSymbolByName: vi.fn(async (name: string) =>
          (currentTable?.getAllSymbols() ?? []).filter(
            (symbol) => symbol.name.toLowerCase() === name.toLowerCase(),
          ),
        ),
        findSymbolByFQN: vi.fn(async () => null),
        resolveCrossFileReferencesForFile: vi.fn(() => Effect.void),
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
        getStorage: () => ({ setDocument: vi.fn() }),
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
    const assistance = vi.fn(async () => ({ accepted: true }));
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

  it('reaches full detail for a definition cursor despite a higher-versioned public-api table', async () => {
    // Reproduces the web-pool go-to-definition failure: the worker already has
    // a PUBLIC-API table for the file at a HIGHER documentVersion (e.g. from a
    // prior write-back), then a definition request arrives carrying live
    // content tagged with a LOWER version. Without the authoritative-cursor-
    // version lift, the full-detail recompile is rejected as stale, the
    // canonical table stays public-api (no private field, no in-body
    // references), and the request reports ready against a table that cannot
    // resolve `this.<field>` — cursor never navigates.
    const uri = 'file:///ApexClassExample.cls';
    const source = [
      'public class ApexClassExample {',
      '    private String instanceId;',
      '',
      '    public ApexClassExample(String instanceId) {',
      '        this.instanceId = instanceId;',
      '    }',
      '}',
    ].join('\n');

    const symbolManager = new ApexSymbolManager();
    // Seed the pool with a public-api table at version 2 (higher than the
    // request version below). Public-api detail strips the private field.
    const publicApiTable = new SymbolTable();
    new CompilerService().compile(
      source,
      uri,
      new VisibilitySymbolListener('public-api', publicApiTable),
      {},
    );
    await Effect.runPromise(
      symbolManager.addSymbolTable(publicApiTable, uri, 2),
    );

    setAssistanceTransport(async (method) => {
      if (method === 'dataOwner:QuerySymbolSubset') {
        return {
          entries: {},
          versions: { [uri]: 2 },
          detailLevels: { [uri]: 'public-api' },
        };
      }
      return { entries: {} };
    });

    const svc = {
      storageManager: {
        getStorage: () => ({ setDocument: vi.fn() }),
      },
      symbolManager,
    } as unknown as Parameters<typeof prepareLspRequestCursor>[0];

    // Definition request at the lower version 1 with authoritative live content.
    const prepared = await Effect.runPromise(
      prepareLspRequestCursor(
        svc,
        'definition',
        uri,
        source,
        { line: 4, character: 13 },
        1,
      ),
    );

    const canonicalTable = await symbolManager.getSymbolTableForFile(uri);
    const symbolNames = canonicalTable
      ?.getAllSymbols()
      .map((symbol) => symbol.name);

    // The full recompile must have won registration: canonical table is
    // full-detail and carries the private field the definition needs.
    expect(canonicalTable?.getDetailLevel()).toBe('full');
    expect(symbolNames).toContain('instanceId');
    // Honest readiness: detail actually reached full, so the request is ready.
    expect(prepared.ready).toBe(true);
  });
});
