/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getLogger, ApexSettingsManager } from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  SymbolTable,
  CompilerService,
  VisibilitySymbolListener,
  ApexSymbolManager,
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

describe('DocumentProcessingService - Batch Processing', () => {
  let service: DocumentProcessingService;
  let logger: ReturnType<typeof getLogger>;
  let symbolManager: ApexSymbolManager;
  let mockStorage: any;
  let mockCache: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup logger
    logger = getLogger();

    // Use real symbol manager
    symbolManager = new ApexSymbolManager();

    // Setup storage
    mockStorage = {
      setDocument: jest.fn().mockResolvedValue(undefined),
    };
    (ApexStorageManager.getInstance as jest.Mock).mockReturnValue({
      getStorage: jest.fn().mockReturnValue(mockStorage),
    } as any);

    // Setup settings manager
    (ApexSettingsManager.getInstance as jest.Mock).mockReturnValue({
      getCompilationOptions: jest.fn().mockReturnValue({}),
    } as any);

    // Setup cache
    mockCache = {
      get: jest.fn().mockReturnValue(null),
      getSymbolResult: jest.fn().mockReturnValue(null),
      merge: jest.fn(),
      clear: jest.fn(),
    };
    (getDocumentStateCache as jest.Mock).mockReturnValue(mockCache);

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

      // First document is cached (diagnostics only, SymbolTable is in manager)
      mockCache.getSymbolResult
        .mockReturnValueOnce({
          diagnostics: [],
        })
        .mockReturnValueOnce(null);

      // Mock that symbols exist in manager for cached document (so it doesn't get recompiled)
      const mockSymbolManager = mockSymbolProcessingManager.getSymbolManager();
      mockSymbolManager.findSymbolsInFile
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
      expect(
        mockCompilerService.compileMultipleWithConfigs,
      ).toHaveBeenCalledWith(
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
      const mockSymbolTable1 = {} as SymbolTable;
      const mockSymbolTable2 = {} as SymbolTable;

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

      // Should add symbols synchronously (same-file references processed, cross-file deferred)
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

      // Cross-file references are resolved on-demand, not during file open
      expect(
        mockSymbolProcessingManager.processSymbolTable,
      ).not.toHaveBeenCalled();
    });
  });
});
