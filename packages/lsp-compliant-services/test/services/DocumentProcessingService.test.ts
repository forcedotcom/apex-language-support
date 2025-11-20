/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TextDocumentChangeEvent, Diagnostic } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getLogger, ApexSettingsManager } from '@salesforce/apex-lsp-shared';
import { Effect, Fiber } from 'effect';
import {
  SymbolTable,
  CompilerService,
  ApexSymbolCollectorListener,
  ApexSymbolProcessingManager,
  createQueuedItem,
  offer,
  SchedulerInitializationService,
  type CompilationResult,
  type CompilationResultWithComments,
} from '@salesforce/apex-lsp-parser-ast';
import { DocumentProcessingService } from '../../src/services/DocumentProcessingService';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';
import { getDocumentStateCache } from '../../src/services/DocumentStateCache';

// Mock the logger
jest.mock('@salesforce/apex-lsp-shared', () => {
  const actual = jest.requireActual('@salesforce/apex-lsp-shared');
  return {
    ...actual,
    getLogger: jest.fn(),
    ApexSettingsManager: {
      getInstance: jest.fn(),
    },
  };
});

// Mock the parser module
jest.mock('@salesforce/apex-lsp-parser-ast', () => {
  const actual = jest.requireActual('@salesforce/apex-lsp-parser-ast');
  return {
    ...actual,
    CompilerService: jest.fn(),
    SymbolTable: jest.fn(),
    ApexSymbolCollectorListener: jest.fn(),
    ApexSymbolProcessingManager: {
      getInstance: jest.fn(),
    },
    SchedulerInitializationService: {
      getInstance: jest.fn(),
    },
    createQueuedItem: jest.fn(),
    offer: jest.fn(),
  };
});

// Mock the storage manager
jest.mock('../../src/storage/ApexStorageManager', () => ({
  ApexStorageManager: {
    getInstance: jest.fn(),
  },
}));

// Mock the definition upserter
jest.mock('../../src/definition/ApexDefinitionUpserter', () => ({
  DefaultApexDefinitionUpserter: jest.fn().mockImplementation(() => ({
    upsertDefinition: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock the references upserter
jest.mock('../../src/references/ApexReferencesUpserter', () => ({
  DefaultApexReferencesUpserter: jest.fn().mockImplementation(() => ({
    upsertReferences: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock document state cache
jest.mock('../../src/services/DocumentStateCache', () => ({
  getDocumentStateCache: jest.fn(),
}));

describe('DocumentProcessingService - Batch Processing', () => {
  let service: DocumentProcessingService;
  let mockLogger: any;
  let mockStorage: any;
  let mockStorageManager: jest.Mocked<typeof ApexStorageManager>;
  let mockSettingsManager: jest.Mocked<typeof ApexSettingsManager>;
  let mockCompilerService: jest.Mocked<CompilerService>;
  let mockSchedulerService: any;
  let mockSymbolProcessingManager: any;
  let mockCache: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    (getLogger as jest.Mock).mockReturnValue(mockLogger);

    // Setup storage
    mockStorage = {
      setDocument: jest.fn().mockResolvedValue(undefined),
    };
    mockStorageManager = ApexStorageManager as jest.Mocked<
      typeof ApexStorageManager
    >;
    mockStorageManager.getInstance.mockReturnValue({
      getStorage: jest.fn().mockReturnValue(mockStorage),
    } as any);

    // Setup settings manager
    mockSettingsManager = ApexSettingsManager as jest.Mocked<
      typeof ApexSettingsManager
    >;
    mockSettingsManager.getInstance.mockReturnValue({
      getCompilationOptions: jest.fn().mockReturnValue({}),
    } as any);

    // Setup compiler service
    mockCompilerService = {
      compile: jest.fn(),
      compileMultiple: jest.fn(),
      compileMultipleWithConfigs: jest.fn(),
    } as any;
    (CompilerService as jest.Mock).mockImplementation(
      () => mockCompilerService,
    );

    // Setup scheduler service
    mockSchedulerService = {
      ensureInitialized: jest.fn().mockResolvedValue(undefined),
      isInitialized: jest.fn().mockReturnValue(true),
    };
    (SchedulerInitializationService.getInstance as jest.Mock).mockReturnValue(
      mockSchedulerService,
    );

    // Setup symbol processing manager
    mockSymbolProcessingManager = {
      processSymbolTable: jest.fn().mockReturnValue('mock-task-id'),
      getTaskStatus: jest.fn().mockReturnValue('COMPLETED'),
      getSymbolManager: jest.fn().mockReturnValue({
        addSymbolTable: jest.fn(),
        removeFile: jest.fn(),
      }),
    };
    (ApexSymbolProcessingManager.getInstance as jest.Mock).mockReturnValue(
      mockSymbolProcessingManager,
    );

    // Setup cache
    mockCache = {
      get: jest.fn().mockReturnValue(null),
      getSymbolResult: jest.fn().mockReturnValue(null),
      merge: jest.fn(),
    };
    (getDocumentStateCache as jest.Mock).mockReturnValue(mockCache);

    // Setup Effect mocks
    const mockFiber: Fiber.RuntimeFiber<any, never> = {
      await: Effect.succeed({ _tag: 'Success', value: [] }),
    } as any;

    (createQueuedItem as jest.Mock).mockImplementation((effect: any) =>
      Effect.succeed({
        eff: effect,
        id: 'test-id',
        fiberDeferred: null as any,
        requestType: 'document-compilation-batch',
      }),
    );

    (offer as jest.Mock).mockImplementation(() =>
      Effect.succeed({
        fiber: Effect.succeed(mockFiber),
      }),
    );

    // Setup SymbolTable and Listener mocks
    const mockSymbolTable = {
      getCurrentScope: jest.fn().mockReturnValue({
        getAllSymbols: jest.fn().mockReturnValue([]),
      }),
    };
    (SymbolTable as jest.Mock).mockImplementation(() => mockSymbolTable);

    const mockListener = {
      getResult: jest.fn().mockReturnValue(mockSymbolTable),
    };
    (ApexSymbolCollectorListener as jest.Mock).mockImplementation(
      () => mockListener,
    );

    service = new DocumentProcessingService(mockLogger);
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

      mockCompilerService.compileMultipleWithConfigs.mockReturnValue(
        Effect.succeed(mockResults),
      );

      const mockFiber: Fiber.RuntimeFiber<any, never> = {
        await: Effect.succeed({
          _tag: 'Success',
          value: mockResults,
        }),
      } as any;

      (offer as jest.Mock).mockReturnValue(
        Effect.succeed({
          fiber: Effect.succeed(mockFiber),
        }),
      );

      const results = await service.processDocumentOpenBatch([event1, event2]);

      expect(results).toHaveLength(2);
      expect(mockCompilerService.compileMultipleWithConfigs).toHaveBeenCalled();
      expect(mockStorage.setDocument).toHaveBeenCalledTimes(2);
    });

    it('should handle cached documents', async () => {
      const event1 = createMockEvent('file:///test1.cls', 1);
      const event2 = createMockEvent('file:///test2.cls', 1);

      // First document is cached
      mockCache.getSymbolResult
        .mockReturnValueOnce({
          diagnostics: [],
          symbolTable: {
            getCurrentScope: jest.fn().mockReturnValue({
              getAllSymbols: jest.fn().mockReturnValue([]),
            }),
          },
        })
        .mockReturnValueOnce(null);

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

      mockCompilerService.compileMultipleWithConfigs.mockReturnValue(
        Effect.succeed(mockResults),
      );

      const mockFiber: Fiber.RuntimeFiber<any, never> = {
        await: Effect.succeed({
          _tag: 'Success',
          value: mockResults,
        }),
      } as any;

      (offer as jest.Mock).mockReturnValue(
        Effect.succeed({
          fiber: Effect.succeed(mockFiber),
        }),
      );

      const results = await service.processDocumentOpenBatch([event1, event2]);

      expect(results).toHaveLength(2);
      // Should only compile the uncached document
      expect(mockCompilerService.compileMultipleWithConfigs).toHaveBeenCalledWith(
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

      mockCompilerService.compileMultipleWithConfigs.mockReturnValue(
        Effect.succeed(mockResults),
      );

      const mockFiber: Fiber.RuntimeFiber<any, never> = {
        await: Effect.succeed({
          _tag: 'Success',
          value: mockResults,
        }),
      } as any;

      (offer as jest.Mock).mockReturnValue(
        Effect.succeed({
          fiber: Effect.succeed(mockFiber),
        }),
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

      const mockFiber: Fiber.RuntimeFiber<any, never> = {
        await: Effect.fail(new Error('Compilation failed')),
      } as any;

      (offer as jest.Mock).mockReturnValue(
        Effect.succeed({
          fiber: Effect.succeed(mockFiber),
        }),
      );

      const results = await service.processDocumentOpenBatch([event1, event2]);

      expect(results).toHaveLength(2);
      // Both should have empty diagnostics on failure
      expect(results[0]).toEqual([]);
      expect(results[1]).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
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

      mockCompilerService.compileMultipleWithConfigs.mockReturnValue(
        Effect.succeed(mockResults),
      );

      const mockFiber: Fiber.RuntimeFiber<any, never> = {
        await: Effect.succeed({
          _tag: 'Success',
          value: mockResults,
        }),
      } as any;

      (offer as jest.Mock).mockReturnValue(
        Effect.succeed({
          fiber: Effect.succeed(mockFiber),
        }),
      );

      const results = await service.processDocumentOpenBatch([event]);

      expect(results).toHaveLength(1);
      expect(mockCompilerService.compileMultipleWithConfigs).toHaveBeenCalled();
    });

    it('should queue symbol processing for each document', async () => {
      const event1 = createMockEvent('file:///test1.cls', 1);
      const event2 = createMockEvent('file:///test2.cls', 1);

      // Create mock symbol tables that will pass instanceof check
      // Use the mocked SymbolTable constructor to create instances
      const mockSymbolTable1 = {
      } as SymbolTable;
      const mockSymbolTable2 = {
      } as SymbolTable;
      
      // Make them pass instanceof check by setting up the mock properly
      Object.setPrototypeOf(mockSymbolTable1, SymbolTable.prototype);
      Object.setPrototypeOf(mockSymbolTable2, SymbolTable.prototype);

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

      mockCompilerService.compileMultipleWithConfigs.mockReturnValue(
        Effect.succeed(mockResults),
      );

      const mockFiber: Fiber.RuntimeFiber<any, never> = {
        await: Effect.succeed({
          _tag: 'Success',
          value: mockResults,
        }),
      } as any;

      // Clear previous mock and set up new one that executes the Effect
      (offer as jest.Mock).mockReset();
      (offer as jest.Mock).mockImplementation((priority, queuedItem) => {
        // Execute the Effect synchronously - Effect.sync should be safe to run sync
        if (queuedItem?.eff) {
          // For Effect.sync, we can run it synchronously
          Effect.runSync(queuedItem.eff);
        }
        return Effect.succeed({
          fiber: Effect.succeed(mockFiber),
        });
      });

      await service.processDocumentOpenBatch([event1, event2]);

      // Should queue symbol processing for both documents via addSymbolTable
      const symbolManager = mockSymbolProcessingManager.getSymbolManager();
      expect(symbolManager.addSymbolTable).toHaveBeenCalledTimes(2);
      expect(symbolManager.addSymbolTable).toHaveBeenCalledWith(
        mockSymbolTable1,
        'file:///test1.cls',
      );
      expect(symbolManager.addSymbolTable).toHaveBeenCalledWith(
        mockSymbolTable2,
        'file:///test2.cls',
      );
    });
  });
});

