/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ReferenceParams } from 'vscode-languageserver-protocol';
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

      const locations = await findRefs(12, 30);
      expect(Array.isArray(locations)).toBe(true);
      expect(locations.length).toBeGreaterThan(0);
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

      const locations = await findRefs(12, 10);
      expect(Array.isArray(locations)).toBe(true);
      expect(locations.length).toBeGreaterThan(0);
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
  });

  describe('overloaded-method disambiguation by signature (W-22692425)', () => {
    // Position (d): an overloaded method name. The two overloads must NOT be
    // collapsed: process(Integer) and process(String) have distinct signature
    // keys, and disambiguateOverload pins to the exact-signature instance.
    const makeMethod = (paramType: string) =>
      ({
        id: `process#${paramType}`,
        name: 'process',
        kind: 'method',
        parameters: [{ type: { name: paramType } }],
      }) as any;

    it('keys overloads by parameter-type signature (does not collapse)', () => {
      const intOverload = makeMethod('Integer');
      const strOverload = makeMethod('String');
      const keyOf = (m: any) => (service as any).methodSignatureKey(m);
      expect(keyOf(intOverload)).toBe('process(Integer)');
      expect(keyOf(strOverload)).toBe('process(String)');
      expect(keyOf(intOverload)).not.toBe(keyOf(strOverload));
    });

    it('preserves the resolved overload when multiple same-named methods exist', async () => {
      const intOverload = makeMethod('Integer');
      const strOverload = makeMethod('String');

      // Two same-named candidates exist in scope.
      jest
        .spyOn(symbolManager, 'findSymbolByName')
        .mockResolvedValue([intOverload, strOverload]);

      // Resolving the String overload must return the String overload, not the
      // first candidate (Integer).
      const result = await (service as any).disambiguateOverload(strOverload);
      expect(result).toBe(strOverload);
      expect((result as any).parameters[0].type.name).toBe('String');
    });

    it('returns the symbol unchanged when only one overload exists', async () => {
      const intOverload = makeMethod('Integer');
      jest
        .spyOn(symbolManager, 'findSymbolByName')
        .mockResolvedValue([intOverload]);
      const result = await (service as any).disambiguateOverload(intOverload);
      expect(result).toBe(intOverload);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Reset scheduler service instance (scheduler is not initialized in tests)
    SchedulerInitializationService.resetInstance();
  });
});
