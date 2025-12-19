/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getLogger, ApexSettingsManager, Priority } from '@salesforce/apex-lsp-shared';
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
        findSymbolsInFile: jest.fn().mockReturnValue([]),
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

    it('should store documents and initialize cache (lazy processing)', async () => {
      const event1 = createMockEvent('file:///test1.cls', 1);
      const event2 = createMockEvent('file:///test2.cls', 1);

      const results = await service.processDocumentOpenBatch([event1, event2]);

      // Lazy processing: returns empty diagnostics immediately
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual([]);
      expect(results[1]).toEqual([]);

      // Documents should be stored
      expect(mockStorage.setDocument).toHaveBeenCalledTimes(2);
      expect(mockStorage.setDocument).toHaveBeenCalledWith(
        'file:///test1.cls',
        event1.document,
      );
      expect(mockStorage.setDocument).toHaveBeenCalledWith(
        'file:///test2.cls',
        event2.document,
      );

      // Cache should be initialized for each document
      expect(mockCache.merge).toHaveBeenCalledTimes(2);
    });

    it('should skip cache initialization for documents with existing cache entries', async () => {
      const event1 = createMockEvent('file:///test1.cls', 1);
      const event2 = createMockEvent('file:///test2.cls', 1);

      // First document has existing cache entry
      mockCache.get
        .mockReturnValueOnce({
          symbolsIndexed: false,
          documentVersion: 1,
        })
        .mockReturnValueOnce(null);

      const results = await service.processDocumentOpenBatch([event1, event2]);

      expect(results).toHaveLength(2);
      // Both return empty diagnostics (lazy processing)
      expect(results[0]).toEqual([]);
      expect(results[1]).toEqual([]);

      // Documents should still be stored
      expect(mockStorage.setDocument).toHaveBeenCalledTimes(2);

      // Cache merge should only be called for the uncached document (event2)
      expect(mockCache.merge).toHaveBeenCalledTimes(1);
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

    it('should handle storage errors gracefully', async () => {
      const event1 = createMockEvent('file:///test1.cls', 1);
      const event2 = createMockEvent('file:///test2.cls', 1);

      // First document storage fails
      mockStorage.setDocument
        .mockRejectedValueOnce(new Error('Storage failed'))
        .mockResolvedValueOnce(undefined);

      // Should not throw, but continue processing
      await expect(
        service.processDocumentOpenBatch([event1, event2]),
      ).rejects.toThrow('Storage failed');
    });

    it('should process single document the same as batch', async () => {
      const event = createMockEvent('file:///test1.cls', 1);

      const results = await service.processDocumentOpenBatch([event]);

      // Should return empty diagnostics (lazy processing)
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual([]);

      // Document should be stored
      expect(mockStorage.setDocument).toHaveBeenCalledTimes(1);
      expect(mockStorage.setDocument).toHaveBeenCalledWith(
        'file:///test1.cls',
        event.document,
      );

      // Cache should be initialized
      expect(mockCache.merge).toHaveBeenCalledTimes(1);
    });

    it('should schedule lazy analysis for each document', async () => {
      // Use fake timers to control debounce behavior
      jest.useFakeTimers();

      const event1 = createMockEvent('file:///test1.cls', 1);
      const event2 = createMockEvent('file:///test2.cls', 1);

      await service.processDocumentOpenBatch([event1, event2]);

      // Documents should be stored
      expect(mockStorage.setDocument).toHaveBeenCalledTimes(2);

      // Cache should be initialized for each document
      expect(mockCache.merge).toHaveBeenCalledTimes(2);

      // Symbol processing is NOT called immediately (lazy processing)
      const symbolManager = mockSymbolProcessingManager.getSymbolManager();
      expect(symbolManager.addSymbolTable).not.toHaveBeenCalled();
      expect(
        mockSymbolProcessingManager.processSymbolTable,
      ).not.toHaveBeenCalled();

      // Restore real timers
      jest.useRealTimers();
    });
  });
});

describe('DocumentProcessingService - Lifecycle', () => {
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();
    DocumentProcessingService.reset(); // Clean slate

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    (getLogger as jest.Mock).mockReturnValue(mockLogger);
  });

  afterEach(() => {
    DocumentProcessingService.reset();
  });

  describe('singleton pattern', () => {
    it('should return same instance for multiple getInstance calls', () => {
      const instance1 = DocumentProcessingService.getInstance(mockLogger);
      const instance2 = DocumentProcessingService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should throw if getInstance called without logger on first call', () => {
      DocumentProcessingService.reset();
      expect(() => DocumentProcessingService.getInstance()).toThrow(
        'Logger must be provided when creating DocumentProcessingService instance',
      );
    });

    it('should ignore logger on subsequent calls', () => {
      const instance1 = DocumentProcessingService.getInstance(mockLogger);
      const differentLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };
      const instance2 = DocumentProcessingService.getInstance(differentLogger);

      expect(instance1).toBe(instance2);
      // Original logger should still be used
    });
  });

  describe('reset()', () => {
    it('should clear singleton instance', () => {
      const instance1 = DocumentProcessingService.getInstance(mockLogger);
      DocumentProcessingService.reset();
      const instance2 = DocumentProcessingService.getInstance(mockLogger);

      expect(instance1).not.toBe(instance2);
    });

    it('should call dispose on existing instance', () => {
      const instance = DocumentProcessingService.getInstance(mockLogger);
      const disposeSpy = jest.spyOn(instance, 'dispose');

      DocumentProcessingService.reset();

      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should be safe to call multiple times', () => {
      DocumentProcessingService.reset();
      DocumentProcessingService.reset();
      DocumentProcessingService.reset();

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('dispose()', () => {
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

    it('should clear all debounce timers', async () => {
      jest.useFakeTimers();

      const instance = DocumentProcessingService.getInstance(mockLogger);

      // Setup mocks for processDocumentOpenBatch
      const mockStorage = {
        setDocument: jest.fn().mockResolvedValue(undefined),
      };
      (ApexStorageManager.getInstance as jest.Mock).mockReturnValue({
        getStorage: jest.fn().mockReturnValue(mockStorage),
      } as any);

      const mockCache = {
        get: jest.fn().mockReturnValue(null),
        merge: jest.fn(),
      };
      (getDocumentStateCache as jest.Mock).mockReturnValue(mockCache);

      // Trigger some debounce timers by processing documents
      await instance.processDocumentOpenBatch([
        createMockEvent('file:///test1.cls', 1),
        createMockEvent('file:///test2.cls', 1),
      ]);

      // Timers should be set
      expect((instance as any).debounceTimers.size).toBeGreaterThan(0);

      instance.dispose();

      // Timers should be cleared
      expect((instance as any).debounceTimers.size).toBe(0);

      jest.useRealTimers();
    });

    it('should clear pending analyses map', async () => {
      const instance = DocumentProcessingService.getInstance(mockLogger);

      // Add a fake pending analysis
      (instance as any).pendingAnalyses.set('test@1', Promise.resolve([]));
      expect((instance as any).pendingAnalyses.size).toBe(1);

      instance.dispose();

      expect((instance as any).pendingAnalyses.size).toBe(0);
    });

    it('should be idempotent (safe to call multiple times)', () => {
      const instance = DocumentProcessingService.getInstance(mockLogger);

      instance.dispose();
      instance.dispose();
      instance.dispose();

      // Should not throw
      expect(instance.disposed).toBe(true);
    });

    it('should set disposed flag', () => {
      const instance = DocumentProcessingService.getInstance(mockLogger);

      expect(instance.disposed).toBe(false);
      instance.dispose();
      expect(instance.disposed).toBe(true);
    });
  });

  describe('disposal behavior', () => {
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

    it('should reject processDocumentOpen after disposal', () => {
      const instance = DocumentProcessingService.getInstance(mockLogger);
      instance.dispose();

      // Should not throw, but should warn
      instance.processDocumentOpen(createMockEvent('file:///test.cls', 1));

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.any(Function), // The log function
      );
    });

    it('should return empty diagnostics from ensureFullAnalysis after disposal', async () => {
      const instance = DocumentProcessingService.getInstance(mockLogger);
      instance.dispose();

      const result = await instance.ensureFullAnalysis(
        'file:///test.cls',
        1,
        { priority: Priority.Normal, reason: 'test' },
      );

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should no-op handleDocumentClose after disposal', () => {
      const instance = DocumentProcessingService.getInstance(mockLogger);
      instance.dispose();

      // Should not throw
      instance.handleDocumentClose('file:///test.cls');
    });
  });
});

describe('DocumentProcessingService - Race Condition Prevention', () => {
  let mockLogger: any;
  let mockStorage: any;
  let mockCache: any;

  beforeEach(() => {
    jest.clearAllMocks();
    DocumentProcessingService.reset();

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    (getLogger as jest.Mock).mockReturnValue(mockLogger);

    mockStorage = {
      setDocument: jest.fn().mockResolvedValue(undefined),
      getDocument: jest.fn().mockResolvedValue({
        uri: 'file:///test.cls',
        version: 1,
        getText: jest.fn().mockReturnValue('public class Test {}'),
      }),
    };
    (ApexStorageManager.getInstance as jest.Mock).mockReturnValue({
      getStorage: jest.fn().mockReturnValue(mockStorage),
    } as any);

    mockCache = {
      get: jest.fn().mockReturnValue(null),
      merge: jest.fn(),
    };
    (getDocumentStateCache as jest.Mock).mockReturnValue(mockCache);

    // Setup compiler service to return valid result
    const mockSymbolTable = new SymbolTable();
    (CompilerService as jest.Mock).mockImplementation(() => ({
      compile: jest.fn().mockReturnValue({
        fileName: 'file:///test.cls',
        result: mockSymbolTable,
        errors: [],
        warnings: [],
      }),
    }));

    // Setup symbol processing manager
    (ApexSymbolProcessingManager.getInstance as jest.Mock).mockReturnValue({
      getSymbolManager: jest.fn().mockReturnValue({
        addSymbolTable: jest.fn().mockResolvedValue(undefined),
      }),
      processSymbolTable: jest.fn(),
    });
  });

  afterEach(() => {
    DocumentProcessingService.reset();
  });

  it('should return same promise for concurrent ensureFullAnalysis calls', async () => {
    const instance = DocumentProcessingService.getInstance(mockLogger);

    // Ensure cache returns null so we don't hit early return
    mockCache.get.mockReturnValue(null);

    // Mock performFullAnalysis to take some time
    let resolvePromise: (value: any) => void;
    const delayedPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    const performFullAnalysisSpy = jest
      .spyOn(instance as any, 'performFullAnalysisWithCleanup')
      .mockImplementation(() => delayedPromise);

    // Make two concurrent calls synchronously (before any await)
    const promise1 = instance.ensureFullAnalysis('file:///test.cls', 1, {
      priority: Priority.Normal,
      reason: 'call1',
    });
    // Check pendingAnalyses immediately - should have one entry
    expect((instance as any).pendingAnalyses.size).toBe(1);
    const storedPromise1 = (instance as any).pendingAnalyses.get('file:///test.cls@1');

    const promise2 = instance.ensureFullAnalysis('file:///test.cls', 1, {
      priority: Priority.Normal,
      reason: 'call2',
    });
    const storedPromise2 = (instance as any).pendingAnalyses.get('file:///test.cls@1');

    // The stored promises should be the same (race condition fix)
    expect(storedPromise1).toBe(storedPromise2);
    // The key test: performFullAnalysisWithCleanup should only be called once
    // This verifies that the second call reuses the promise from the first call
    expect(performFullAnalysisSpy).toHaveBeenCalledTimes(1);

    // Both promises should resolve to the same value
    resolvePromise!([]);
    const [result1, result2] = await Promise.all([promise1, promise2]);
    expect(result1).toEqual(result2);
  });

  it('should allow new analysis after previous completes', async () => {
    const instance = DocumentProcessingService.getInstance(mockLogger);

    let callCount = 0;
    jest.spyOn(instance as any, 'performFullAnalysis').mockImplementation(() => {
      callCount++;
      return Promise.resolve([]);
    });

    // First call
    await instance.ensureFullAnalysis('file:///test.cls', 1, {
      priority: Priority.Normal,
      reason: 'call1',
    });
    expect(callCount).toBe(1);

    // Second call after first completes (different version)
    await instance.ensureFullAnalysis('file:///test.cls', 2, {
      priority: Priority.Normal,
      reason: 'call2',
    });
    expect(callCount).toBe(2);
  });

  it('should clean up pendingAnalyses after completion', async () => {
    const instance = DocumentProcessingService.getInstance(mockLogger);

    jest
      .spyOn(instance as any, 'performFullAnalysis')
      .mockResolvedValue([]);

    await instance.ensureFullAnalysis('file:///test.cls', 1, {
      priority: Priority.Normal,
      reason: 'test',
    });

    // Map should be empty after completion
    expect((instance as any).pendingAnalyses.size).toBe(0);
  });

  it('should clean up pendingAnalyses even on error', async () => {
    const instance = DocumentProcessingService.getInstance(mockLogger);

    jest
      .spyOn(instance as any, 'performFullAnalysis')
      .mockImplementation(() => Promise.reject(new Error('Test error')));

    // Should not throw (error is caught)
    try {
      await instance.ensureFullAnalysis('file:///test.cls', 1, {
        priority: Priority.Normal,
        reason: 'test',
      });
    } catch (error) {
      // Error is expected, but cleanup should still happen
    }

    // Map should still be empty
    expect((instance as any).pendingAnalyses.size).toBe(0);
  });
});
