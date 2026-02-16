/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Integration tests for TIER 2 semantic validation with missing artifact loading.
 *
 * These tests verify the complete flow documented in the sequence diagram:
 * 1. TIER 2 validator detects missing type (e.g., ClassHierarchyValidator finds missing superclass)
 * 2. Validator calls ArtifactLoadingHelper.loadMissingArtifacts()
 * 3. ArtifactLoadingHelper calls loadArtifactCallback (from DiagnosticProcessingService)
 * 4. MissingArtifactResolutionService.resolveBlocking() → LSPQueueManager.submitRequest()
 * 5. Queue routes to MissingArtifactProcessingService.processFindMissingArtifact()
 * 6. MissingArtifactProcessingService sends apex/findMissingArtifact request to client
 * 7. Client responds with FindMissingArtifactResult containing opened file URIs
 * 8. didOpen processing compiles artifact and adds to SymbolManager
 * 9. Validator re-checks and resolves the type
 *
 * NOTE: These tests use real services (CompilerService, ApexStorageManager, SymbolManager)
 * and only mock external dependencies (LSP client connection, settings). This ensures
 * we test the actual compilation and symbol collection behavior.
 */

import { DocumentDiagnosticParams } from 'vscode-languageserver';
import {
  LoggerInterface,
  getLogger,
  enableConsoleLogging,
  setLogLevel,
  ApexSettingsManager,
  FindMissingArtifactResult,
  Priority,
  LSPConfigurationManager,
} from '@salesforce/apex-lsp-shared';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { DiagnosticProcessingService } from '../../src/services/DiagnosticProcessingService';
import { DocumentProcessingService } from '../../src/services/DocumentProcessingService';
import { getDocumentStateCache } from '../../src/services/DocumentStateCache';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';
import { ApexStorage } from '../../src/storage/ApexStorage';
import {
  ApexSymbolManager,
  ApexSymbolProcessingManager,
  SchedulerInitializationService,
} from '@salesforce/apex-lsp-parser-ast';
import { LSPQueueManager } from '../../src/queue/LSPQueueManager';
import { MissingArtifactProcessingService } from '../../src/services/MissingArtifactProcessingService';
import { GenericRequestHandler } from '../../src/registry/GenericRequestHandler';
import { cleanupTestResources } from '../helpers/test-cleanup';
import { readFileSync } from 'fs';
import { join } from 'path';

// Minimal mocks - only mock external LSP client connection and settings
// Use real services for compilation, symbol management, and storage
jest.mock('@salesforce/apex-lsp-shared', () => {
  const actual = jest.requireActual('@salesforce/apex-lsp-shared');
  return {
    ...actual,
    LSPConfigurationManager: {
      getInstance: jest.fn(),
    },
    ApexSettingsManager: {
      getInstance: jest.fn(),
    },
  };
});

describe('DiagnosticProcessingService - Artifact Loading Integration', () => {
  let logger: LoggerInterface;
  let storageManager: ApexStorageManager;
  let symbolManager: ApexSymbolManager;
  let service: DiagnosticProcessingService;
  let mockConnection: any;
  let mockConfigManager: any;
  let mockSettingsManager: any;
  let queueManager: LSPQueueManager;
  let missingArtifactService: MissingArtifactProcessingService;

  beforeAll(() => {
    enableConsoleLogging();
    setLogLevel('error');
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    logger = getLogger();

    // Reset storage manager singleton to ensure clean state
    ApexStorageManager.reset();

    // Use real storage manager with in-memory storage factory
    // This creates a real ApexStorage instance for testing
    // Note: ApexStorage is also a singleton, but since we reset ApexStorageManager
    // and each test gets a fresh manager instance, the shared ApexStorage instance
    // should be fine for integration tests
    storageManager = ApexStorageManager.getInstance({
      storageFactory: () => ApexStorage.getInstance(),
      autoPersistIntervalMs: 0, // Disable auto-persist for tests
    });
    await storageManager.initialize();

    // Setup mock connection (external LSP client)
    mockConnection = {
      sendRequest: jest.fn(),
    };

    // Setup mock config manager (provides LSP connection)
    mockConfigManager = {
      getConnection: jest.fn().mockReturnValue(mockConnection),
    };

    (LSPConfigurationManager.getInstance as jest.Mock).mockReturnValue(
      mockConfigManager,
    );

    // Setup mock settings manager (only for settings, not compilation)
    mockSettingsManager = {
      getSettings: jest.fn().mockReturnValue({
        apex: {
          findMissingArtifact: {
            enabled: true,
          },
          scheduler: {
            queueCapacity: {
              CRITICAL: 128,
              IMMEDIATE: 128,
              HIGH: 128,
              NORMAL: 128,
              LOW: 256,
              BACKGROUND: 256,
            },
            maxHighPriorityStreak: 10,
            idleSleepMs: 25,
            queueStateNotificationIntervalMs: 500,
          },
          queueProcessing: {
            maxConcurrency: {
              CRITICAL: 100,
              IMMEDIATE: 50,
              HIGH: 50,
              NORMAL: 25,
              LOW: 10,
              BACKGROUND: 5,
            },
            maxTotalConcurrency: 240,
            yieldInterval: 50,
            yieldDelayMs: 25,
          },
        },
      }),
    };

    (ApexSettingsManager.getInstance as jest.Mock).mockReturnValue(
      mockSettingsManager,
    );

    // Reset ApexSymbolProcessingManager to ensure clean state
    ApexSymbolProcessingManager.reset();

    // Use real symbol manager from ApexSymbolProcessingManager singleton
    // This ensures DocumentProcessingService uses the same instance
    const symbolProcessingManager = ApexSymbolProcessingManager.getInstance();
    await symbolProcessingManager.initialize();
    symbolManager = symbolProcessingManager.getSymbolManager();

    // Initialize queue manager and missing artifact service
    queueManager = LSPQueueManager.getInstance();
    missingArtifactService = new MissingArtifactProcessingService(logger);

    // Register the missing artifact handler with the queue
    // This is needed so the queue can route findMissingArtifact requests
    const handler = new GenericRequestHandler(
      'findMissingArtifact',
      missingArtifactService,
      Priority.High,
      2000,
      0,
    );
    queueManager['serviceRegistry'].register(handler);

    // Verify handler is registered
    const registeredHandler = queueManager['serviceRegistry'].getHandler(
      'findMissingArtifact',
    );
    if (!registeredHandler) {
      throw new Error(
        'Failed to register findMissingArtifact handler in test setup',
      );
    }

    // Ensure scheduler is initialized so queue can submit requests
    // Use real scheduler initialization (it's safe in tests)
    const schedulerService = SchedulerInitializationService.getInstance();
    await schedulerService.ensureInitialized();

    // Clear the document state cache to avoid test interference
    const cache = getDocumentStateCache();
    cache.clear();

    // Create service with real symbol manager
    service = new DiagnosticProcessingService(logger, symbolManager);

    // Verify handler is registered (should still be from earlier registration)
    const handlerCheck = queueManager['serviceRegistry'].getHandler(
      'findMissingArtifact',
    );
    if (!handlerCheck) {
      // Re-register if needed
      const handler = new GenericRequestHandler(
        'findMissingArtifact',
        missingArtifactService,
        Priority.High,
        2000,
        0,
      );
      queueManager['serviceRegistry'].register(handler);
    }

    // Wait for validators to initialize (they're initialized asynchronously in constructor)
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterEach(async () => {
    // Clean up per-test resources
    try {
      if (symbolManager) {
        symbolManager.clear();
      }
    } catch (_error) {
      // Ignore errors during cleanup
    }

    // Reset ApexSymbolProcessingManager singleton
    try {
      ApexSymbolProcessingManager.reset();
    } catch (_error) {
      // Ignore errors during cleanup
    }

    // Clear the document state cache
    try {
      const cache = getDocumentStateCache();
      cache.clear();
    } catch (_error) {
      // Ignore errors - cache might not be available
    }
  });

  afterAll(async () => {
    // Clean up all test resources that may leave open handles
    // This shuts down the scheduler, LSPQueueManager, and other services
    await cleanupTestResources();
  });

  describe('TIER 2 Validation with Missing Artifact Loading', () => {
    it('should load missing artifact via client request when TIER 2 validator needs cross-file type', async () => {
      // Test scenario: A class extends a missing superclass that needs to be loaded
      // Read fixtures from test/fixtures/classes directory
      const fixturesDir = join(__dirname, '../fixtures/classes');
      const classAPath = join(fixturesDir, 'ClassA.cls');
      const missingSuperClassPath = join(fixturesDir, 'MissingSuperClass.cls');

      const classAContent = readFileSync(classAPath, 'utf8');
      const missingSuperClassContent = readFileSync(
        missingSuperClassPath,
        'utf8',
      );

      const classAUri = 'file:///ClassA.cls';
      const missingSuperClassUri = 'file:///MissingSuperClass.cls';

      // Create documents from fixture content
      const classADocument = TextDocument.create(
        classAUri,
        'apex',
        1,
        classAContent,
      );

      const _missingSuperClassDocument = TextDocument.create(
        missingSuperClassUri,
        'apex',
        1,
        missingSuperClassContent,
      );

      // Store documents in real storage manager
      // DiagnosticProcessingService will use real storage to get documents
      const storage = storageManager.getStorage();
      await storage.setDocument(classAUri, classADocument);
      // MissingSuperClass will be added when client responds

      // Mock the client response: client finds and opens MissingSuperClass
      mockConnection.sendRequest.mockImplementation(
        async (method: string, params: any) => {
          if (method === 'apex/findMissingArtifact') {
            // Simulate client finding the missing artifact
            // In real scenario, client would open the file and trigger didOpen
            // For this test, we'll simulate the response and trigger didOpen processing
            const result: FindMissingArtifactResult = {
              opened: [missingSuperClassUri],
            };

            // Simulate the didOpen processing that happens when client opens file
            // Add the document to storage and trigger didOpen processing
            setTimeout(async () => {
              const missingSuperClassDoc = TextDocument.create(
                missingSuperClassUri,
                'apex',
                1,
                missingSuperClassContent,
              );
              await storage.setDocument(
                missingSuperClassUri,
                missingSuperClassDoc,
              );

              // Trigger didOpen processing to compile and add to symbol manager
              // This simulates what happens when the client opens the file
              const documentProcessingService = new DocumentProcessingService(
                logger,
              );
              await documentProcessingService.processDocumentOpenInternal({
                document: missingSuperClassDoc,
              });
            }, 10);

            return result;
          }
          return null;
        },
      );

      // Ensure handler is registered (should already be from beforeEach)
      const currentQueueManager = LSPQueueManager.getInstance();
      if (
        !currentQueueManager['serviceRegistry'].hasHandler(
          'findMissingArtifact',
        )
      ) {
        const testHandler = new GenericRequestHandler(
          'findMissingArtifact',
          missingArtifactService,
          Priority.High,
          2000,
          0,
        );
        currentQueueManager['serviceRegistry'].register(testHandler);
      }

      // Process diagnostics for ClassA - this should trigger TIER 2 validation
      const params: DocumentDiagnosticParams = {
        textDocument: { uri: classAUri },
      };

      // Run diagnostics - this should:
      // 1. Parse ClassA
      // 2. Run TIER 1 validators (no missing artifacts needed)
      // 3. Run TIER 2 validators (ClassHierarchyValidator needs MissingSuperClass)
      // 4. ClassHierarchyValidator calls ArtifactLoadingHelper.loadMissingArtifacts
      // 5. ArtifactLoadingHelper calls loadArtifactCallback
      // 6. MissingArtifactResolutionService → Queue → MissingArtifactProcessingService
      // 7. Client receives apex/findMissingArtifact request
      // 8. Client responds with opened file URI
      // 9. didOpen processing adds MissingSuperClass to SymbolManager
      // 10. Validator re-checks and resolves superclass

      const result = await service.processDiagnostic(params);

      // Wait for async didOpen processing to complete
      // The setTimeout in the mock adds the document after 10ms, then didOpen processing happens
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify client request was made
      // Diagnostics use background mode - load files without opening in editor
      expect(mockConnection.sendRequest).toHaveBeenCalledWith(
        'apex/findMissingArtifact',
        expect.objectContaining({
          identifier: 'MissingSuperClass',
          mode: 'background',
          origin: expect.objectContaining({
            uri: classAUri,
            requestKind: 'references',
          }),
        }),
      );

      // Verify MissingSuperClass was added to SymbolManager
      const missingSuperClassSymbols =
        symbolManager.findSymbolByName('MissingSuperClass');
      expect(missingSuperClassSymbols.length).toBeGreaterThan(0);
      expect(missingSuperClassSymbols[0].kind.toLowerCase()).toBe('class');

      // Verify diagnostics were processed (may or may not have errors depending on type compatibility)
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle missing artifact not found scenario', async () => {
      // Read fixture from test/fixtures/classes directory
      const fixturesDir = join(__dirname, '../fixtures/classes');
      const classAPath = join(
        fixturesDir,
        'ClassAWithNonExistentSuperClass.cls',
      );

      const classAContent = readFileSync(classAPath, 'utf8');

      const classAUri = 'file:///ClassAWithNonExistentSuperClass.cls';
      const classADocument = TextDocument.create(
        classAUri,
        'apex',
        1,
        classAContent,
      );

      // Store document in real storage manager
      const storage = storageManager.getStorage();
      await storage.setDocument(classAUri, classADocument);

      // Mock client response: artifact not found
      mockConnection.sendRequest.mockResolvedValue({
        notFound: true,
      });

      const params: DocumentDiagnosticParams = {
        textDocument: { uri: classAUri },
      };

      const result = await service.processDiagnostic(params);

      // Verify client request was made
      expect(mockConnection.sendRequest).toHaveBeenCalledWith(
        'apex/findMissingArtifact',
        expect.objectContaining({
          identifier: 'NonExistentSuperClass',
        }),
      );

      // Verify NonExistentSuperClass was NOT added to SymbolManager
      const symbols = symbolManager.findSymbolByName('NonExistentSuperClass');
      expect(symbols.length).toBe(0);

      // Diagnostics should still be returned (may have type errors)
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should respect artifact loading disabled setting', async () => {
      // Read fixture from test/fixtures/classes directory
      const fixturesDir = join(__dirname, '../fixtures/classes');
      const classAPath = join(fixturesDir, 'ClassA.cls');

      const classAContent = readFileSync(classAPath, 'utf8');

      const classAUri = 'file:///ClassA.cls';
      const classADocument = TextDocument.create(
        classAUri,
        'apex',
        1,
        classAContent,
      );

      // Store document in real storage manager
      const storage = storageManager.getStorage();
      await storage.setDocument(classAUri, classADocument);

      // Disable artifact loading
      mockSettingsManager.getSettings.mockReturnValue({
        apex: {
          findMissingArtifact: {
            enabled: false,
          },
        },
      });

      const params: DocumentDiagnosticParams = {
        textDocument: { uri: classAUri },
      };

      const result = await service.processDiagnostic(params);

      // Verify client request was NOT made
      expect(mockConnection.sendRequest).not.toHaveBeenCalledWith(
        'apex/findMissingArtifact',
        expect.anything(),
      );

      // Diagnostics should still be returned
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle multiple missing artifacts in sequence', async () => {
      // ClassA extends MissingClass1, which extends MissingClass2
      // Read fixtures from test/fixtures/classes directory
      const fixturesDir = join(__dirname, '../fixtures/classes');
      const classAPath = join(fixturesDir, 'ClassAWithMissingClass1.cls');
      const missingClass1Path = join(fixturesDir, 'MissingClass1.cls');
      const missingClass2Path = join(fixturesDir, 'MissingClass2.cls');

      const classAContent = readFileSync(classAPath, 'utf8');
      const missingClass1Content = readFileSync(missingClass1Path, 'utf8');
      const missingClass2Content = readFileSync(missingClass2Path, 'utf8');

      const classAUri = 'file:///ClassAWithMissingClass1.cls';
      const missingClass1Uri = 'file:///MissingClass1.cls';
      const missingClass2Uri = 'file:///MissingClass2.cls';

      const classADocument = TextDocument.create(
        classAUri,
        'apex',
        1,
        classAContent,
      );

      // Store document in real storage manager
      const storage = storageManager.getStorage();
      await storage.setDocument(classAUri, classADocument);

      let _callCount = 0;
      mockConnection.sendRequest.mockImplementation(
        async (method: string, params: any) => {
          if (method === 'apex/findMissingArtifact') {
            _callCount++;
            const identifier = params.identifier;

            if (identifier === 'MissingClass1') {
              // First artifact found - add to storage and trigger didOpen processing
              setTimeout(async () => {
                const missingClass1Doc = TextDocument.create(
                  missingClass1Uri,
                  'apex',
                  1,
                  missingClass1Content,
                );
                const storage = storageManager.getStorage();
                await storage.setDocument(missingClass1Uri, missingClass1Doc);

                // Trigger didOpen processing to compile and add to symbol manager
                const documentProcessingService = new DocumentProcessingService(
                  logger,
                );
                await documentProcessingService.processDocumentOpenInternal({
                  document: missingClass1Doc,
                });
              }, 10);

              return { opened: [missingClass1Uri] };
            } else if (identifier === 'MissingClass2') {
              // Second artifact found - add to storage and trigger didOpen processing
              setTimeout(async () => {
                const missingClass2Doc = TextDocument.create(
                  missingClass2Uri,
                  'apex',
                  1,
                  missingClass2Content,
                );
                const storage = storageManager.getStorage();
                await storage.setDocument(missingClass2Uri, missingClass2Doc);

                // Trigger didOpen processing to compile and add to symbol manager
                const documentProcessingService = new DocumentProcessingService(
                  logger,
                );
                await documentProcessingService.processDocumentOpenInternal({
                  document: missingClass2Doc,
                });
              }, 10);

              return { opened: [missingClass2Uri] };
            }

            return { notFound: true };
          }
          return null;
        },
      );

      const params: DocumentDiagnosticParams = {
        textDocument: { uri: classAUri },
      };

      const result = await service.processDiagnostic(params);

      // Wait for async didOpen processing to complete
      // The setTimeout in the mock adds the documents after 10ms, then didOpen processing happens
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify both artifacts were requested (though second may be requested when validating MissingClass1)
      expect(mockConnection.sendRequest).toHaveBeenCalledWith(
        'apex/findMissingArtifact',
        expect.objectContaining({
          identifier: 'MissingClass1',
        }),
      );

      // Verify artifacts were added to SymbolManager
      const missingClass1Symbols =
        symbolManager.findSymbolByName('MissingClass1');
      expect(missingClass1Symbols.length).toBeGreaterThan(0);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
