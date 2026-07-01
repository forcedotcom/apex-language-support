/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Location, ReferenceParams } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getLogger } from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';
import { readFileSync } from 'fs';
import { join } from 'path';

import { ReferencesProcessingService } from '../../src/services/ReferencesProcessingService';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';
import {
  ApexSymbolManager,
  CompilerService,
  FullSymbolCollectorListener,
  SymbolTable,
  SchedulerInitializationService,
} from '@salesforce/apex-lsp-parser-ast';

// Only mock storage - use real implementations for everything else
jest.mock('../../src/storage/ApexStorageManager');

// Mock scheduler utilities to prevent scheduler from starting in tests
jest.mock('@salesforce/apex-lsp-parser-ast', () => {
  const actual = jest.requireActual('@salesforce/apex-lsp-parser-ast');
  return {
    ...actual,
    offer: jest.fn(() => Effect.succeed({ fiber: Effect.void } as any)),
    createQueuedItem: jest.fn((eff: any) =>
      Effect.succeed({ id: 'mock', eff, fiberDeferred: {} } as any),
    ),
    SchedulerInitializationService: {
      ...actual.SchedulerInitializationService,
      getInstance: jest.fn(() => ({
        ensureInitialized: jest.fn(() => Promise.resolve()),
        isInitialized: jest.fn(() => false),
        resetInstance: jest.fn(),
      })),
      resetInstance: jest.fn(),
    },
  };
});

jest.mock('@salesforce/apex-lsp-shared', () => {
  const actual = jest.requireActual('@salesforce/apex-lsp-shared');
  return {
    ...actual,
    ApexSettingsManager: {
      getInstance: jest.fn(() => ({
        getSettings: jest.fn().mockReturnValue({
          apex: {
            queueProcessing: {
              maxConcurrency: {
                IMMEDIATE: 50,
                HIGH: 50,
                NORMAL: 25,
                LOW: 10,
              },
              yieldInterval: 50,
              yieldDelayMs: 25,
            },
            scheduler: {
              queueCapacity: 100,
              maxHighPriorityStreak: 50,
              idleSleepMs: 1,
            },
          },
        }),
      })),
    },
  };
});

const mockEnsureLoaded = jest.fn();
const mockIsWorkspaceLoaded = jest.fn();
const mockIsWorkspaceLoading = jest.fn();
jest.mock('../../src/services/WorkspaceLoadCoordinator', () => {
  const actual = jest.requireActual(
    '../../src/services/WorkspaceLoadCoordinator',
  );
  return {
    ...actual,
    isWorkspaceLoaded: jest.fn(() => mockIsWorkspaceLoaded()),
    isWorkspaceLoading: jest.fn(() => mockIsWorkspaceLoading()),
  };
});

describe('ReferencesProcessingService', () => {
  let service: ReferencesProcessingService;
  let logger: ReturnType<typeof getLogger>;
  let symbolManager: ApexSymbolManager;
  let mockStorage: any;
  let mockCoordinator: { ensureLoaded: jest.Mock };

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    mockEnsureLoaded.mockClear();
    mockIsWorkspaceLoaded.mockReturnValue(false);
    mockIsWorkspaceLoading.mockReturnValue(false);

    // Reset scheduler service instance (but don't initialize - scheduler is mocked)
    SchedulerInitializationService.resetInstance();

    // Setup logger
    logger = getLogger();

    // Use real symbol manager
    symbolManager = new ApexSymbolManager();

    // Pre-populate symbol manager with fixtures
    const compilerService = new CompilerService();
    const fixturesDir = join(__dirname, '../fixtures/classes');
    const testClassPath = join(fixturesDir, 'TestClass.cls');
    const testClassContent = readFileSync(testClassPath, 'utf8');

    const symbolTable = new SymbolTable();
    const listener = new FullSymbolCollectorListener(symbolTable);
    compilerService.compile(
      testClassContent,
      'file:///test/TestClass.cls',
      listener,
    );
    await Effect.runPromise(
      symbolManager.addSymbolTable(symbolTable, 'file:///test/TestClass.cls'),
    );

    // Setup mock storage
    mockStorage = {
      getDocument: jest.fn(),
    };

    (ApexStorageManager.getInstance as jest.Mock).mockReturnValue({
      getStorage: jest.fn().mockReturnValue(mockStorage),
    });

    // Default mock coordinator returns an Effect that resolves immediately
    mockEnsureLoaded.mockReturnValue(Effect.succeed(undefined));
    mockCoordinator = {
      ensureLoaded: jest.fn((...args: any[]) => mockEnsureLoaded(...args)),
    };

    // Create service instance with real symbol manager and injected coordinator
    service = new ReferencesProcessingService(
      logger,
      symbolManager,
      mockCoordinator as any,
    );
  });

  describe('processReferences', () => {
    it('should return empty array when no references found', async () => {
      // Arrange
      const params: ReferenceParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
        context: { includeDeclaration: false },
      };

      const document = TextDocument.create(
        params.textDocument.uri,
        'apex',
        1,
        'public class TestClass {\n  public void doSomething() {\n  }\n}',
      );

      mockStorage.getDocument.mockResolvedValue(document);

      // Mock all the internal methods to return empty results
      jest.spyOn(service as any, 'findReferences').mockResolvedValue([]);

      // Act
      const result = await service.processReferences(params);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should trigger workspace load when no references found', async () => {
      // Arrange
      const params: ReferenceParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
        context: { includeDeclaration: false },
      };

      const document = TextDocument.create(
        params.textDocument.uri,
        'apex',
        1,
        'public class TestClass {\n  public void doSomething() {\n  }\n}',
      );

      mockStorage.getDocument.mockResolvedValue(document);

      // Mock findReferences to return empty array (no references found)
      jest.spyOn(service as any, 'findReferences').mockResolvedValue([]);

      // Ensure workspace state functions return false so coordinator gets called
      mockIsWorkspaceLoaded.mockReturnValue(false);
      mockIsWorkspaceLoading.mockReturnValue(false);

      // Mock coordinator to return an Effect
      mockEnsureLoaded.mockReturnValue(Effect.succeed(undefined));

      // Act
      const result = await service.processReferences(params);

      // Assert
      expect(result).toBeDefined();
      expect(mockCoordinator.ensureLoaded).toHaveBeenCalledWith(
        params.workDoneToken,
      );
    });

    it('should not trigger workspace load when no coordinator is injected', async () => {
      // Service constructed with no coordinator
      const noCoordService = new ReferencesProcessingService(
        logger,
        symbolManager,
      );

      const params: ReferenceParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
        context: { includeDeclaration: false },
      };

      const document = TextDocument.create(
        params.textDocument.uri,
        'apex',
        1,
        'public class TestClass {\n  public void doSomething() {\n  }\n}',
      );

      mockStorage.getDocument.mockResolvedValue(document);

      // Act
      const result = await noCoordService.processReferences(params);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockCoordinator.ensureLoaded).not.toHaveBeenCalled();
    });

    it('should handle missing document gracefully', async () => {
      // Arrange
      const params: ReferenceParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
        context: { includeDeclaration: false },
      };

      mockStorage.getDocument.mockResolvedValue(null);

      // Act
      const result = await service.processReferences(params);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return empty array when position is on keyword', async () => {
      // Arrange
      const params: ReferenceParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 2, character: 4 }, // Position on "if" keyword
        context: { includeDeclaration: false },
      };

      const document = TextDocument.create(
        params.textDocument.uri,
        'apex',
        1,
        'public class TestClass {\n  if (true) {\n  }\n}',
      );

      mockStorage.getDocument.mockResolvedValue(document);

      // Mock getWordRangeAtPosition to return range for "if"
      jest.spyOn(service as any, 'getWordRangeAtPosition').mockReturnValue({
        start: { line: 2, character: 2 },
        end: { line: 2, character: 4 },
      });

      // Act
      const result = await service.processReferences(params);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle missing symbol gracefully', async () => {
      // Arrange
      const params: ReferenceParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
        context: { includeDeclaration: false },
      };

      const document = TextDocument.create(
        params.textDocument.uri,
        'apex',
        1,
        'public class TestClass {\n  public void doSomething() {\n  }\n}',
      );

      mockStorage.getDocument.mockResolvedValue(document);

      // Act
      const result = await service.processReferences(params);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle includeDeclaration parameter', async () => {
      // Arrange
      const params: ReferenceParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
        context: {
          includeDeclaration: true,
        },
      };

      const document = TextDocument.create(
        params.textDocument.uri,
        'apex',
        1,
        'public class TestClass {\n  public void doSomething() {\n  }\n}',
      );

      mockStorage.getDocument.mockResolvedValue(document);

      // Mock findReferences to return empty array
      jest.spyOn(service as any, 'findReferences').mockResolvedValue([]);

      // Act
      const result = await service.processReferences(params);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle workspace load errors gracefully', async () => {
      // Arrange
      const params: ReferenceParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
        context: { includeDeclaration: false },
      };

      const document = TextDocument.create(
        params.textDocument.uri,
        'apex',
        1,
        'public class TestClass {\n  public void doSomething() {\n  }\n}',
      );

      mockStorage.getDocument.mockResolvedValue(document);

      // Ensure workspace state functions return false so coordinator gets called
      mockIsWorkspaceLoaded.mockReturnValue(false);
      mockIsWorkspaceLoading.mockReturnValue(false);

      mockEnsureLoaded.mockReturnValue(
        Effect.fail(new Error('Workspace load failed')),
      );

      // Act
      const result = await service.processReferences(params);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockCoordinator.ensureLoaded).toHaveBeenCalled();
    });
  });

  describe('location/URI helpers', () => {
    // Build a SymbolLocation-shaped object (symbolRange + identifierRange).
    const makeLocation = (
      startLine: number,
      startColumn: number,
      endLine: number,
      endColumn: number,
    ) => ({
      symbolRange: { startLine, startColumn, endLine, endColumn },
      identifierRange: { startLine, startColumn, endLine, endColumn },
    });

    describe('createLocationFromSymbol', () => {
      it('reads identifierRange for a same-file symbol (no NaN -> null)', async () => {
        const symbol = {
          name: 'TestClass',
          fileUri: 'file:///test/TestClass.cls',
          location: makeLocation(3, 13, 3, 22),
        };

        const result = await (service as any).createLocationFromSymbol(symbol);

        expect(result).not.toBeNull();
        expect(result.uri).toBe('file:///test/TestClass.cls');
        // Parser line is 1-based, LSP is 0-based; column unchanged.
        expect(result.range).toEqual({
          start: { line: 2, character: 13 },
          end: { line: 2, character: 22 },
        });
      });

      it('reads identifierRange for a cross-file symbol', async () => {
        const symbol = {
          name: 'OtherClass',
          fileUri: 'file:///other/OtherClass.cls',
          location: makeLocation(10, 4, 10, 14),
        };

        const result = await (service as any).createLocationFromSymbol(symbol);

        expect(result).not.toBeNull();
        expect(result.uri).toBe('file:///other/OtherClass.cls');
        expect(result.range.start).toEqual({ line: 9, character: 4 });
        expect(result.range.end).toEqual({ line: 9, character: 14 });
      });

      it('returns null when the symbol has no location', async () => {
        const result = await (service as any).createLocationFromSymbol({
          name: 'NoLocation',
          fileUri: 'file:///test/NoLocation.cls',
        });
        expect(result).toBeNull();
      });

      it('returns null when the location has no identifierRange', async () => {
        const result = await (service as any).createLocationFromSymbol({
          name: 'TestClass',
          fileUri: 'file:///test/TestClass.cls',
          location: { symbolRange: { startLine: 1, startColumn: 0 } },
        });
        expect(result).toBeNull();
      });
    });

    describe('createLocationFromReference', () => {
      it('reads identifierRange for a same-file reference', () => {
        const reference = {
          name: 'doSomething',
          fileUri: 'file:///test/TestClass.cls',
          location: makeLocation(5, 8, 5, 19),
        };

        const result = (service as any).createLocationFromReference(reference);

        expect(result).not.toBeNull();
        expect(result.uri).toBe('file:///test/TestClass.cls');
        expect(result.range).toEqual({
          start: { line: 4, character: 8 },
          end: { line: 4, character: 19 },
        });
      });

      it('reads identifierRange for a cross-file reference (via resolved symbol)', () => {
        const reference = {
          name: 'doSomething',
          symbol: { fileUri: 'file:///other/Caller.cls' },
          location: makeLocation(7, 2, 7, 13),
        };

        const result = (service as any).createLocationFromReference(reference);

        expect(result).not.toBeNull();
        expect(result.uri).toBe('file:///other/Caller.cls');
        expect(result.range.start).toEqual({ line: 6, character: 2 });
        expect(result.range.end).toEqual({ line: 6, character: 13 });
      });

      it('returns null when the reference has no location', () => {
        const result = (service as any).createLocationFromReference({
          name: 'NoLocation',
          fileUri: 'file:///test/TestClass.cls',
        });
        expect(result).toBeNull();
      });

      it('returns null when the location has no identifierRange', () => {
        const result = (service as any).createLocationFromReference({
          name: 'doSomething',
          fileUri: 'file:///test/TestClass.cls',
          location: { symbolRange: { startLine: 1, startColumn: 0 } },
        });
        expect(result).toBeNull();
      });
    });

    describe('getReferenceLocations dedup', () => {
      it('collapses the same (uri, range) surfaced twice by the inbound walk', async () => {
        // findReferencesTo is override-aware: a call site reachable through two
        // related types (e.g. an interface and its implementor) can be listed
        // twice. It must appear once, not twice, in the returned Location[].
        const dupRef = {
          name: 'Base',
          fileUri: 'file:///test/Derived.cls',
          location: makeLocation(2, 21, 2, 25),
        };
        const uniqueRef = {
          name: 'Base',
          fileUri: 'file:///test/Other.cls',
          location: makeLocation(9, 4, 9, 8),
        };

        jest
          .spyOn(symbolManager, 'findReferencesTo')
          .mockResolvedValue([dupRef, uniqueRef, dupRef] as any);

        const symbol = {
          name: 'Base',
          fileUri: 'file:///test/Base.cls',
        };

        const locations = await (service as any).getReferenceLocations(
          symbol,
          false,
        );

        // dupRef once + uniqueRef once = 2, not 3.
        expect(locations).toHaveLength(2);
        const derivedHits = locations.filter(
          (l: any) =>
            l.uri === 'file:///test/Derived.cls' &&
            l.range.start.line === 1 &&
            l.range.start.character === 21,
        );
        expect(derivedHits).toHaveLength(1);
      });

      it('returns ONLY inbound references — never outbound (findReferencesFrom / findRelatedSymbols)', async () => {
        // "Find references" means "where is this symbol USED" — the inbound edges
        // from findReferencesTo. The handler must NOT union outbound edges (what
        // the symbol itself references), which previously flooded a single
        // method's results with dozens of its own callees/fields/types.
        const inbound = {
          name: 'target',
          fileUri: 'file:///test/Caller.cls',
          location: makeLocation(5, 8, 5, 14),
        };
        const outbound = {
          name: 'somethingTheMethodCalls',
          fileUri: 'file:///test/Target.cls',
          location: makeLocation(12, 4, 12, 27),
        };

        const toSpy = jest
          .spyOn(symbolManager, 'findReferencesTo')
          .mockResolvedValue([inbound] as any);
        const fromSpy = jest
          .spyOn(symbolManager, 'findReferencesFrom')
          .mockResolvedValue([outbound] as any);
        const relatedSpy = jest
          .spyOn(symbolManager, 'findRelatedSymbols')
          .mockResolvedValue([outbound] as any);

        const symbol = { name: 'target', fileUri: 'file:///test/Target.cls' };
        const locations = await (service as any).getReferenceLocations(
          symbol,
          false,
        );

        // Only the inbound reference — the outbound edge must not appear.
        expect(locations).toHaveLength(1);
        expect(locations[0].uri).toBe('file:///test/Caller.cls');
        expect(toSpy).toHaveBeenCalled();
        // Outbound sources must not be consulted at all.
        expect(fromSpy).not.toHaveBeenCalled();
        expect(relatedSpy).not.toHaveBeenCalled();
      });

      // Review finding 3: the dedup key must not use an unescaped delimiter that
      // can appear inside a URI. Legacy Windows drive URIs (`file:///C|/...`) and
      // percent-encoded `%7C` both contain pipes, so a raw `join('|')` could let
      // a URI's pipe align with a field boundary and collapse two DISTINCT
      // locations onto one key.
      it('does not collapse distinct pipe-containing URIs (delimiter safety)', () => {
        // Two genuinely different locations. Under a naive `join('|')`:
        //   'file:///C|/A.cls' + '|' + 0 + '|' + 0 + '|' + 0 + '|' + 10
        //   'file:///C'        + '|' + '/A.cls|0' ...  (pipe in URI shifts fields)
        // a crafted pair can produce the same joined string. JSON.stringify
        // quotes the URI, so the two stay distinct.
        const locA: Location = {
          uri: 'file:///C|/A.cls',
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 10 },
          },
        };
        const locB: Location = {
          uri: 'file:///C',
          range: {
            start: { line: 0, character: 0 }, // '/A.cls' would be folded in
            end: { line: 0, character: 10 },
          },
        };

        const deduped = (service as any).dedupeLocations([locA, locB]);
        expect(deduped).toHaveLength(2);
      });

      it('still collapses exact duplicates whose URI contains a pipe', () => {
        const loc: Location = {
          uri: 'file:///C|/path/With%7CPipe.cls',
          range: {
            start: { line: 3, character: 2 },
            end: { line: 3, character: 9 },
          },
        };
        const deduped = (service as any).dedupeLocations([
          loc,
          { ...loc, range: { ...loc.range } },
        ]);
        expect(deduped).toHaveLength(1);
      });
    });

    describe('getSymbolFileUri', () => {
      it('prefers fileUri when present', async () => {
        const uri = await (service as any).getSymbolFileUri({
          name: 'TestClass',
          fileUri: 'file:///test/TestClass.cls',
        });
        expect(uri).toBe('file:///test/TestClass.cls');
      });
    });

    describe('getReferenceFileUri', () => {
      it('prefers fileUri on the reference', () => {
        const uri = (service as any).getReferenceFileUri({
          fileUri: 'file:///test/TestClass.cls',
        });
        expect(uri).toBe('file:///test/TestClass.cls');
      });

      it('prefers fileUri on the resolved symbol', () => {
        const uri = (service as any).getReferenceFileUri({
          symbol: { fileUri: 'file:///other/Caller.cls' },
        });
        expect(uri).toBe('file:///other/Caller.cls');
      });

      it('returns null when no file information is available', () => {
        const uri = (service as any).getReferenceFileUri({ name: 'orphan' });
        expect(uri).toBeNull();
      });
    });
  });

  describe('chainNodes + position-based resolution (W-22692425)', () => {
    const chainedUri = 'file:///test/ChainedRefTestClass.cls';
    let chainedDoc: TextDocument;

    beforeEach(async () => {
      // Compile and register the chained-reference fixture into the same
      // symbol manager used by the service.
      const compilerService = new CompilerService();
      const fixturesDir = join(__dirname, '../fixtures/classes');
      const content = readFileSync(
        join(fixturesDir, 'ChainedRefTestClass.cls'),
        'utf8',
      );
      const symbolTable = new SymbolTable();
      const listener = new FullSymbolCollectorListener(symbolTable);
      compilerService.compile(content, chainedUri, listener);
      await Effect.runPromise(
        symbolManager.addSymbolTable(symbolTable, chainedUri),
      );

      chainedDoc = TextDocument.create(chainedUri, 'apex', 1, content);
      mockStorage.getDocument.mockResolvedValue(chainedDoc);
    });

    // Helper: drive findReferences directly with an LSP position (0-based line).
    const findRefs = (lspLine: number, lspChar: number) => {
      const params: ReferenceParams = {
        textDocument: { uri: chainedUri },
        position: { line: lspLine, character: lspChar },
        context: { includeDeclaration: true },
      };
      return (service as any).findReferences(params) as Promise<unknown[]>;
    };

    // Position (a): leaf type in a chained type ref -> "GeocodingAddress".
    // Parser line 13 / col 30 == LSP line 12 / col 30.
    it('resolves the leaf segment of a chained type reference', async () => {
      const picked = (service as any).pickNameUnderCursor(
        {
          name: 'ChainedRefTestClass.GeocodingAddress',
          chainNodes: [
            {
              name: 'ChainedRefTestClass',
              location: {
                identifierRange: {
                  startLine: 13,
                  startColumn: 4,
                  endLine: 13,
                  endColumn: 23,
                },
              },
            },
            {
              name: 'GeocodingAddress',
              location: {
                identifierRange: {
                  startLine: 13,
                  startColumn: 24,
                  endLine: 13,
                  endColumn: 40,
                },
              },
            },
          ],
        },
        { line: 13, character: 30 },
      );
      expect(picked).toBe('GeocodingAddress');

      const locations = (await findRefs(12, 30)) as Location[];
      expect(Array.isArray(locations)).toBe(true);
      expect(locations.length).toBeGreaterThan(0);

      // Strengthened: the leaf must resolve to the nested GeocodingAddress
      // class declaration (line 8 in the fixture, 0-based LSP line 7), NOT to
      // the enclosing ChainedRefTestClass declaration (line 7 / LSP line 6).
      const targetLines = locations.map((loc) => loc.range.start.line).sort();
      expect(targetLines).toContain(7);
      expect(targetLines).not.toContain(6);
    });

    // Position (b): inner/qualifier segment -> "ChainedRefTestClass".
    it('resolves the qualifier segment of a chained type reference', async () => {
      const picked = (service as any).pickNameUnderCursor(
        {
          name: 'ChainedRefTestClass.GeocodingAddress',
          chainNodes: [
            {
              name: 'ChainedRefTestClass',
              location: {
                identifierRange: {
                  startLine: 13,
                  startColumn: 4,
                  endLine: 13,
                  endColumn: 23,
                },
              },
            },
            {
              name: 'GeocodingAddress',
              location: {
                identifierRange: {
                  startLine: 13,
                  startColumn: 24,
                  endLine: 13,
                  endColumn: 40,
                },
              },
            },
          ],
        },
        { line: 13, character: 10 },
      );
      expect(picked).toBe('ChainedRefTestClass');

      const locations = (await findRefs(12, 10)) as Location[];
      expect(Array.isArray(locations)).toBe(true);
      expect(locations.length).toBeGreaterThan(0);

      // Strengthened: the qualifier must resolve to the top-level
      // ChainedRefTestClass declaration (line 7 / LSP line 6), NOT the nested
      // GeocodingAddress class (line 8 / LSP line 7). This proves the qualifier
      // position resolves to a DIFFERENT symbol than the leaf position above.
      const targetLines = locations.map((loc) => loc.range.start.line).sort();
      expect(targetLines).toContain(6);
      expect(targetLines).not.toContain(7);
    });

    // Position (c): a plain unqualified name -> "process" (method call).
    // Parser line 26 / col 6 == LSP line 25 / col 6.
    it('resolves a plain unqualified name', async () => {
      const locations = await findRefs(25, 6);
      expect(Array.isArray(locations)).toBe(true);
      expect(locations.length).toBeGreaterThan(0);
    });

    // Falls back to the leaf identifier when no chain node spans the cursor
    // (dotted name with no chainNodes match).
    it('falls back to the last segment of a dotted name', () => {
      const picked = (service as any).pickNameUnderCursor(
        { name: 'Outer.Inner.Leaf' },
        { line: 1, character: 0 },
      );
      expect(picked).toBe('Leaf');
    });

    // P2.5: cursor exactly on the `.` separator between two chain nodes.
    // The dot column lies in the gap between the qualifier's identifierRange
    // (ends col 5, "A") and the leaf's (starts col 7, "B"), so no chain node
    // contains it. pickNameUnderCursor then applies its documented leaf-bias:
    // it returns the LEAF segment ("B") regardless of which side of the dot the
    // cursor sits on - so for "A.B" the user gets B even if they meant A.
    it('applies leaf-bias when the cursor is on the dot separator', () => {
      // "A.B": A occupies cols 4-5, the dot is col 6, B occupies cols 7-8.
      const reference = {
        name: 'A.B',
        chainNodes: [
          {
            name: 'A',
            location: {
              identifierRange: {
                startLine: 13,
                startColumn: 4,
                endLine: 13,
                endColumn: 5,
              },
            },
          },
          {
            name: 'B',
            location: {
              identifierRange: {
                startLine: 13,
                startColumn: 7,
                endLine: 13,
                endColumn: 8,
              },
            },
          },
        ],
      };
      // Cursor on the dot (col 6): neither node's range contains it.
      const onDot = (service as any).pickNameUnderCursor(reference, {
        line: 13,
        character: 6,
      });
      expect(onDot).toBe('B');

      // Sanity: a cursor inside the qualifier still picks the qualifier.
      const onQualifier = (service as any).pickNameUnderCursor(reference, {
        line: 13,
        character: 4,
      });
      expect(onQualifier).toBe('A');
    });

    // P1.1: cursor on whitespace/non-identifier inside a method body must
    // return [], NOT the enclosing method's references. The 'precise'
    // resolution strategy (which findReferences requests) only matches when the
    // cursor lands on a symbol's own identifierRange; it does NOT fall through
    // to the 'scope' strategy's Step-4 containing-scope match. So a whitespace
    // cursor yields no precise symbol, and with no name resolution either the
    // result is []. Here we assert the service requests 'precise' and returns []
    // when neither precise nor name resolution finds a symbol.
    it('returns [] for a cursor on whitespace inside a method body (no containing-scope leak)', async () => {
      const getSymbolAtPosition = jest
        .spyOn(symbolManager, 'getSymbolAtPosition')
        // 'precise' refuses the containing-scope match -> no symbol at the
        // whitespace position.
        .mockResolvedValue(null);
      jest
        .spyOn(symbolManager, 'getReferencesAtPosition')
        // Non-empty so we pass the early gate in findReferences.
        .mockResolvedValue([{ name: 'value' } as any]);
      jest
        .spyOn(symbolManager, 'resolveSymbol')
        .mockResolvedValue({ symbol: null } as any);

      // Parser line 18 / col 0 (leading whitespace) == LSP line 17 / col 0.
      const locations = (await findRefs(17, 0)) as Location[];
      expect(locations).toEqual([]);

      // The guard is delegated to the strategy: the service must ask for
      // 'precise', not the default 'scope' strategy.
      expect(getSymbolAtPosition).toHaveBeenCalledWith(
        chainedUri,
        expect.objectContaining({ line: 18, character: 0 }),
        'precise',
      );
    });

    // Regression (declaration identifier): find-references invoked FROM a
    // method's own declaration must surface its call sites. getReferencesAtPosition
    // returns empty at a declaration (declarations are not stored as usage
    // tokens), so the old hard short-circuit on empty references returned []
    // here even though references existed. The fix lets the empty-references
    // case fall through to getSymbolAtPosition('precise'), which resolves the
    // declaration identifier - mirroring Hover/Definition. This is the
    // dreamhouse GeocodingService.geocodeAddresses symptom in miniature.
    it('finds references when invoked from a method declaration identifier', async () => {
      // `process(Integer)` is declared at fixture line 17 (LSP line 16),
      // `process` starts at col 17. It is called at lines 26-27.
      const locations = (await findRefs(16, 17)) as Location[];
      expect(Array.isArray(locations)).toBe(true);
      // Must surface at least one call site despite the cursor being on the
      // declaration (where there is no usage token to gate on).
      expect(locations.length).toBeGreaterThan(0);
      const targetLines = locations.map((loc) => loc.range.start.line);
      // The Integer-overload call `process(42)` is on fixture line 26 (LSP 25).
      expect(targetLines).toContain(25);
    });
  });

  describe('locals-only references (single-file scope)', () => {
    const localsUri = 'file:///test/LocalsOnly.cls';
    // `total` is a local declared once and read on the next two lines. Find
    // References on it must stay WITHIN the method — never escaping to the
    // same-named field or to another method's local.
    const localsSrc = [
      'public class LocalsOnly {',
      '    public Integer compute() {',
      '        Integer total = 0;',
      '        total = total + 1;',
      '        return total;',
      '    }',
      '    public Integer other() {',
      '        Integer total = 99;',
      '        return total;',
      '    }',
      '}',
    ].join('\n');

    beforeEach(async () => {
      const compilerService = new CompilerService();
      const symbolTable = new SymbolTable();
      compilerService.compile(
        localsSrc,
        localsUri,
        new FullSymbolCollectorListener(symbolTable),
      );
      await Effect.runPromise(
        symbolManager.addSymbolTable(symbolTable, localsUri),
      );
      mockStorage.getDocument.mockResolvedValue(
        TextDocument.create(localsUri, 'apex', 1, localsSrc),
      );
    });

    const findRefs = (lspLine: number, lspChar: number) =>
      (service as any).findReferences({
        textDocument: { uri: localsUri },
        position: { line: lspLine, character: lspChar },
        context: { includeDeclaration: true },
      }) as Promise<Location[]>;

    it('resolves a local variable to its in-method usages only', async () => {
      // Cursor on `total` in `total = total + 1;` (line 3, 0-based) col 8.
      const locations = await findRefs(3, 8);

      expect(Array.isArray(locations)).toBe(true);
      expect(locations.length).toBeGreaterThan(0);

      // Every location is in this file (a local never resolves cross-file).
      for (const loc of locations) {
        expect(loc.uri).toBe(localsUri);
      }

      // All hits fall within compute()'s body (LSP lines 2–4); none leak into
      // other()'s same-named local on lines 7–8.
      const lines = locations.map((l) => l.range.start.line).sort();
      for (const line of lines) {
        expect(line).toBeGreaterThanOrEqual(2);
        expect(line).toBeLessThanOrEqual(4);
      }
      // other()'s `total` declaration (line 7) must NOT appear.
      expect(lines).not.toContain(7);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Reset scheduler service instance (scheduler is not initialized in tests)
    SchedulerInitializationService.resetInstance();
  });
});
