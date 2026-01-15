/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

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
jest.mock('../../src/storage/ApexStorageManager');

jest.mock('../../src/definition/ApexDefinitionUpserter', () => ({
  DefaultApexDefinitionUpserter: jest.fn().mockImplementation(() => ({
    upsertDefinition: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('../../src/references/ApexReferencesUpserter', () => ({
  DefaultApexReferencesUpserter: jest.fn().mockImplementation(() => ({
    upsertReferences: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('../../src/services/DocumentStateCache', () => ({
  getDocumentStateCache: jest.fn(),
}));

// Mock CompilerService and scheduler utilities
const mockCompileMultipleWithConfigs = jest.fn();
jest.mock('@salesforce/apex-lsp-parser-ast', () => {
  const actual = jest.requireActual('@salesforce/apex-lsp-parser-ast');
  return {
    ...actual,
    CompilerService: jest.fn().mockImplementation(() => ({
      compileMultipleWithConfigs: mockCompileMultipleWithConfigs,
    })),
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
    ApexSymbolProcessingManager: {
      ...actual.ApexSymbolProcessingManager,
      getInstance: jest.fn(),
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
        getCompilationOptions: jest.fn().mockReturnValue({}),
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
  let mockSymbolProcessingManager: jest.Mocked<
    typeof ApexSymbolProcessingManager
  >;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup logger
    logger = getLogger();
    jest.spyOn(logger, 'error');
    jest.spyOn(logger, 'debug');
    jest.spyOn(logger, 'warn');

    // Use real symbol manager
    symbolManager = new ApexSymbolManager();

    // Setup storage
    mockStorage = {
      setDocument: jest.fn().mockResolvedValue(undefined),
    };
    (ApexStorageManager.getInstance as jest.Mock).mockReturnValue({
      getStorage: jest.fn().mockReturnValue(mockStorage),
    } as any);

    // Setup cache
    mockCache = {
      get: jest.fn().mockReturnValue(null),
      getSymbolResult: jest.fn().mockReturnValue(null),
      merge: jest.fn(),
      clear: jest.fn(),
      hasDetailLevel: jest.fn().mockReturnValue(false),
    };
    (
      getDocumentStateCache as jest.MockedFunction<typeof getDocumentStateCache>
    ).mockReturnValue(mockCache as any);

    // Reset the mock for compileMultipleWithConfigs
    mockCompileMultipleWithConfigs.mockReset();

    // Mock ApexSymbolProcessingManager
    mockSymbolProcessingManager = ApexSymbolProcessingManager as jest.Mocked<
      typeof ApexSymbolProcessingManager
    >;
    // Spy on symbolManager methods
    jest.spyOn(symbolManager, 'addSymbolTable');
    jest.spyOn(symbolManager, 'findSymbolsInFile');
    mockSymbolProcessingManager.getInstance.mockReturnValue({
      getSymbolManager: jest.fn().mockReturnValue(symbolManager),
      processSymbolTable: jest.fn(),
    } as any);

    service = new DocumentProcessingService(logger);
  });

  const createMockEvent = (
    uri: string,
    version: number = 1,
  ): TextDocumentChangeEvent<TextDocument> => ({
    document: {
      uri,
      languageId: 'apex',
      version,
      getText: jest.fn().mockReturnValue('public class Test {}'),
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
      (symbolManager.findSymbolsInFile as jest.Mock)
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
      );
      expect(symbolManager.addSymbolTable).toHaveBeenCalledWith(
        mockSymbolTable2,
        'file:///test2.cls',
      );

      // Cross-file references are resolved on-demand, not during file open
      expect(
        mockSymbolProcessingManager.getInstance().processSymbolTable,
      ).not.toHaveBeenCalled();
    });
  });
});
