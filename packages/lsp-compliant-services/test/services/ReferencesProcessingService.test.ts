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

  afterEach(() => {
    jest.restoreAllMocks();
    // Reset scheduler service instance (scheduler is not initialized in tests)
    SchedulerInitializationService.resetInstance();
  });
});
