/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Mock, Mocked, MockedFunction } from 'vitest';
import { vi } from 'vitest';
import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getLogger } from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';
import {
  SymbolTable,
  ApexSymbolManager,
  ApexSymbolProcessingManager,
  type CompilationResult,
} from '@salesforce/apex-lsp-parser-ast';
import { DocumentProcessingService } from '../../src/services/DocumentProcessingService';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';
import { getDocumentStateCache } from '../../src/services/DocumentStateCache';

// Only mock storage and upserters - use real implementations for everything else
vi.mock('../../src/storage/ApexStorageManager');

vi.mock('../../src/definition/ApexDefinitionUpserter', () => ({
  DefaultApexDefinitionUpserter: vi.fn(function () {
    return { upsertDefinition: vi.fn().mockResolvedValue(undefined) };
  }),
}));

vi.mock('../../src/references/ApexReferencesUpserter', () => ({
  DefaultApexReferencesUpserter: vi.fn(function () {
    return { upsertReferences: vi.fn().mockResolvedValue(undefined) };
  }),
}));

vi.mock('../../src/services/DocumentStateCache', () => ({
  getDocumentStateCache: vi.fn(),
}));

// Mock CompilerService and scheduler utilities
const mockCompileMultipleWithConfigs = vi.fn();
vi.mock('@salesforce/apex-lsp-parser-ast', async () => {
  const actual = await vi.importActual<
    typeof import('@salesforce/apex-lsp-parser-ast')
  >('@salesforce/apex-lsp-parser-ast');
  return {
    ...actual,
    CompilerService: class {
      compileMultipleWithConfigs = mockCompileMultipleWithConfigs;
    },
    offer: vi.fn(() => Effect.succeed({ fiber: Effect.void } as any)),
    createQueuedItem: vi.fn((eff: any) =>
      Effect.succeed({ id: 'mock', eff, fiberDeferred: {} } as any),
    ),
    SchedulerInitializationService: {
      ...actual.SchedulerInitializationService,
      getInstance: vi.fn(() => ({
        ensureInitialized: vi.fn(() => Promise.resolve()),
        isInitialized: vi.fn(() => false),
        resetInstance: vi.fn(),
      })),
      resetInstance: vi.fn(),
    },
    ApexSymbolProcessingManager: {
      ...actual.ApexSymbolProcessingManager,
      getInstance: vi.fn(),
    },
  };
});
vi.mock('@salesforce/apex-lsp-shared', async () => {
  const actual = await vi.importActual('@salesforce/apex-lsp-shared');
  return {
    ...actual,
    ApexSettingsManager: {
      getInstance: vi.fn(() => ({
        getSettings: vi.fn().mockReturnValue({
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
        getCompilationOptions: vi.fn().mockReturnValue({}),
      })),
    },
  };
});

describe('DocumentProcessingService - Batch Processing', () => {
  let service: DocumentProcessingService;
  let logger: ReturnType<typeof getLogger>;
  let symbolManager: ApexSymbolManager;
  let mockStorage: any;
  let mockCache: any;
  let mockSymbolProcessingManager: Mocked<typeof ApexSymbolProcessingManager>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup logger
    logger = getLogger();
    vi.spyOn(logger, 'error');
    vi.spyOn(logger, 'debug');
    vi.spyOn(logger, 'warn');

    // Use real symbol manager
    symbolManager = new ApexSymbolManager();

    // Setup storage
    mockStorage = {
      setDocument: vi.fn().mockResolvedValue(undefined),
    };
    (ApexStorageManager.getInstance as Mock).mockReturnValue({
      getStorage: vi.fn().mockReturnValue(mockStorage),
    } as any);

    // Setup cache
    mockCache = {
      get: vi.fn().mockReturnValue(null),
      getSymbolResult: vi.fn().mockReturnValue(null),
      merge: vi.fn(),
      clear: vi.fn(),
      hasDetailLevel: vi.fn().mockReturnValue(false),
    };
    (
      getDocumentStateCache as MockedFunction<typeof getDocumentStateCache>
    ).mockReturnValue(mockCache as any);

    // Reset the mock for compileMultipleWithConfigs
    mockCompileMultipleWithConfigs.mockReset();

    // Mock ApexSymbolProcessingManager
    mockSymbolProcessingManager = ApexSymbolProcessingManager as Mocked<
      typeof ApexSymbolProcessingManager
    >;
    // Spy on symbolManager methods
    vi.spyOn(symbolManager, 'addSymbolTable');
    vi.spyOn(symbolManager, 'findSymbolsInFile');
    mockSymbolProcessingManager.getInstance.mockReturnValue({
      getSymbolManager: vi.fn().mockReturnValue(symbolManager),
      processSymbolTable: vi.fn(),
    } as any);

    service = new DocumentProcessingService(logger);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createMockEvent = (
    uri: string,
    version: number = 1,
  ): TextDocumentChangeEvent<TextDocument> => ({
    document: {
      uri,
      languageId: 'apex',
      version,
      getText: vi.fn().mockReturnValue('public class Test {}'),
    } as any,
  });

  describe('processDocumentOpenBatch', () => {
    it('should return empty array for empty events', async () => {
      const result = await service.processDocumentOpenBatch([]);
      expect(result).toEqual([]);
    });

    it('should process batch of documents with successful compilation', async () => {
      const event1 = createMockEvent('file:///test1.cls', 1);
      const event2 = createMockEvent('file:///test2.cls', 1);

      const mockResults: CompilationResult<SymbolTable>[] = [
        {
          fileName: 'file:///test1.cls',
          result: null,
          errors: [],
          warnings: [],
        },
        {
          fileName: 'file:///test2.cls',
          result: null,
          errors: [],
          warnings: [],
        },
      ];

      mockCompileMultipleWithConfigs.mockReturnValue(
        Effect.succeed(mockResults),
      );

      const results = await service.processDocumentOpenBatch([event1, event2]);

      expect(results).toHaveLength(2);
      expect(mockCompileMultipleWithConfigs).toHaveBeenCalled();
      expect(mockStorage.setDocument).toHaveBeenCalledTimes(2);
    });

    it.each([
      [
        'class',
        'apex-org-artifact:/apex-class/remoteservice.cls',
        "global class RemoteService { global String greet() { return 'hi'; } }",
      ],
      [
        'trigger',
        'apex-org-artifact:/trigger/accounttrigger.trigger',
        'trigger AccountTrigger on Account (before insert) {}',
      ],
    ])(
      'routes VFS-backed Apex %s source through the normal compiler',
      async (_kind: string, uri: string, source: string) => {
        const event = createMockEvent(uri, 1);
        (event.document.getText as Mock).mockReturnValue(source);
        mockCompileMultipleWithConfigs.mockReturnValue(
          Effect.succeed([
            {
              fileName: uri,
              result: null,
              errors: [],
              warnings: [],
            },
          ]),
        );

        await service.processDocumentOpenBatch([event]);

        expect(mockCompileMultipleWithConfigs).toHaveBeenCalledWith([
          expect.objectContaining({
            content: source,
            fileName: uri,
          }),
        ]);
      },
    );

    it('should handle cached documents', async () => {
      const event1 = createMockEvent('file:///test1.cls', 1);
      const event2 = createMockEvent('file:///test2.cls', 1);

      // First document is cached (diagnostics only, SymbolTable is in manager)
      mockCache.getSymbolResult
        .mockReturnValueOnce({
          diagnostics: [],
        })
        .mockReturnValueOnce(null);

      // Mock that symbols exist in manager for cached document (so it doesn't get recompiled)
      (symbolManager.findSymbolsInFile as Mock)
        .mockReturnValueOnce([{ name: 'TestClass' }]) // Symbols exist for test1.cls
        .mockReturnValueOnce([]); // No symbols for test2.cls

      mockCache.get.mockReturnValueOnce({
        symbolsIndexed: false,
        documentVersion: 1,
      });

      const mockResults: CompilationResult<SymbolTable>[] = [
        {
          fileName: 'file:///test2.cls',
          result: null,
          errors: [],
          warnings: [],
        },
      ];

      mockCompileMultipleWithConfigs.mockReturnValue(
        Effect.succeed(mockResults),
      );

      const results = await service.processDocumentOpenBatch([event1, event2]);

      expect(results).toHaveLength(2);
      // Should only compile the uncached document
      expect(mockCompileMultipleWithConfigs).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            fileName: 'file:///test2.cls',
          }),
        ]),
      );
    });

    it('should handle compilation errors', async () => {
      const event1 = createMockEvent('file:///test1.cls', 1);
      const event2 = createMockEvent('file:///test2.cls', 1);

      const mockResults: CompilationResult<SymbolTable>[] = [
        {
          fileName: 'file:///test1.cls',
          result: null,
          errors: [
            {
              type: 'semantic' as any,
              severity: 'error' as any,
              message: 'Syntax error',
              line: 1,
              column: 1,
              fileUri: 'file:///test1.cls',
            },
          ],
          warnings: [],
        },
        {
          fileName: 'file:///test2.cls',
          result: null,
          errors: [],
          warnings: [],
        },
      ];

      mockCompileMultipleWithConfigs.mockReturnValue(
        Effect.succeed(mockResults),
      );

      const results = await service.processDocumentOpenBatch([event1, event2]);

      expect(results).toHaveLength(2);
      // First should have diagnostics, second should be empty
      expect(results[0]).toBeDefined();
      expect(results[1]).toEqual([]);
    });

    it('should handle batch compilation failure', async () => {
      const event1 = createMockEvent('file:///test1.cls', 1);
      const event2 = createMockEvent('file:///test2.cls', 1);

      mockCompileMultipleWithConfigs.mockReturnValue(
        Effect.fail(new Error('Compilation failed')),
      );

      const results = await service.processDocumentOpenBatch([event1, event2]);

      expect(results).toHaveLength(2);
      // Both should have empty diagnostics on failure
      expect(results[0]).toEqual([]);
      expect(results[1]).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should process all documents individually if batch size is 1', async () => {
      const event = createMockEvent('file:///test1.cls', 1);

      const mockResults: CompilationResult<SymbolTable>[] = [
        {
          fileName: 'file:///test1.cls',
          result: null,
          errors: [],
          warnings: [],
        },
      ];

      mockCompileMultipleWithConfigs.mockReturnValue(
        Effect.succeed(mockResults),
      );

      const results = await service.processDocumentOpenBatch([event]);

      expect(results).toHaveLength(1);
      expect(mockCompileMultipleWithConfigs).toHaveBeenCalled();
    });

    it('should queue symbol processing for each document', async () => {
      const event1 = createMockEvent('file:///test1.cls', 1);
      const event2 = createMockEvent('file:///test2.cls', 1);

      // Create real symbol tables (not mocks) so instanceof checks pass
      const mockSymbolTable1 = new SymbolTable();
      const mockSymbolTable2 = new SymbolTable();

      const mockResults: CompilationResult<SymbolTable>[] = [
        {
          fileName: 'file:///test1.cls',
          result: mockSymbolTable1,
          errors: [],
          warnings: [],
        },
        {
          fileName: 'file:///test2.cls',
          result: mockSymbolTable2,
          errors: [],
          warnings: [],
        },
      ];

      mockCompileMultipleWithConfigs.mockReturnValue(
        Effect.succeed(mockResults),
      );

      await service.processDocumentOpenBatch([event1, event2]);

      // Should add symbols synchronously (same-file references processed, cross-file deferred)
      expect(symbolManager.addSymbolTable).toHaveBeenCalledTimes(2);
      expect(symbolManager.addSymbolTable).toHaveBeenCalledWith(
        mockSymbolTable1,
        'file:///test1.cls',
        1,
        false,
      );
      expect(symbolManager.addSymbolTable).toHaveBeenCalledWith(
        mockSymbolTable2,
        'file:///test2.cls',
        1,
        false,
      );

      // Cross-file references are resolved on-demand, not during file open
      expect(
        mockSymbolProcessingManager.getInstance().processSymbolTable,
      ).not.toHaveBeenCalled();
    });
  });
});
