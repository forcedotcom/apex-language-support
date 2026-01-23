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
 * NOTE: These tests currently have issues with queue/scheduler mocking and may need
 * further work to properly test the async queue processing flow.
 */

import { DocumentSymbolParams } from 'vscode-languageserver';
import {
  LoggerInterface,
  getLogger,
  enableConsoleLogging,
  setLogLevel,
  ApexSettingsManager,
  FindMissingArtifactResult,
  Priority,
} from '@salesforce/apex-lsp-shared';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { DiagnosticProcessingService } from '../../src/services/DiagnosticProcessingService';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';
import {
  ApexSymbolManager,
  CompilerService,
  FullSymbolCollectorListener,
  SymbolTable,
} from '@salesforce/apex-lsp-parser-ast';
import { Effect } from 'effect';
import { LSPQueueManager } from '../../src/queue/LSPQueueManager';
import { MissingArtifactProcessingService } from '../../src/services/MissingArtifactProcessingService';
import { GenericRequestHandler } from '../../src/registry/GenericRequestHandler';

// Mock implementations
jest.mock('../../src/storage/ApexStorageManager');
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

// Mock scheduler to prevent it from actually running
jest.mock('@salesforce/apex-lsp-parser-ast', () => {
  const actual = jest.requireActual('@salesforce/apex-lsp-parser-ast');
  return {
    ...actual,
    SchedulerInitializationService: {
      ...actual.SchedulerInitializationService,
      getInstance: jest.fn(() => ({
        ensureInitialized: jest.fn(() => Promise.resolve()),
        isInitialized: jest.fn(() => true),
        resetInstance: jest.fn(),
      })),
      resetInstance: jest.fn(),
    },
  };
});

describe('DiagnosticProcessingService - Artifact Loading Integration', () => {
  let logger: LoggerInterface;
  let mockStorage: any;
  let symbolManager: ApexSymbolManager;
  let service: DiagnosticProcessingService;
  let mockConnection: any;
  let mockConfigManager: any;
  let mockSettingsManager: any;
  let compilerService: CompilerService;
  let queueManager: LSPQueueManager;
  let missingArtifactService: MissingArtifactProcessingService;

  beforeAll(() => {
    enableConsoleLogging();
    setLogLevel('error');
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    logger = getLogger();

    // Setup mock storage
    mockStorage = {
      getDocument: jest.fn(),
    };

    (ApexStorageManager.getInstance as jest.Mock).mockReturnValue({
      getStorage: jest.fn().mockReturnValue(mockStorage),
    });

    // Setup mock connection
    mockConnection = {
      sendRequest: jest.fn(),
    };

    // Setup mock config manager
    mockConfigManager = {
      getConnection: jest.fn().mockReturnValue(mockConnection),
    };

    const { LSPConfigurationManager } = require('@salesforce/apex-lsp-shared');
    (LSPConfigurationManager.getInstance as jest.Mock).mockReturnValue(
      mockConfigManager,
    );

    // Setup mock settings manager
    mockSettingsManager = {
      getSettings: jest.fn().mockReturnValue({
        apex: {
          findMissingArtifact: {
            enabled: true,
          },
        },
      }),
    };

    (ApexSettingsManager.getInstance as jest.Mock).mockReturnValue(
      mockSettingsManager,
    );

    // Use real symbol manager
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();

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

    // Clear the document state cache to avoid test interference
    const {
      getDocumentStateCache,
    } = require('../../src/services/DocumentStateCache');
    const cache = getDocumentStateCache();
    cache.clear();

    service = new DiagnosticProcessingService(logger, symbolManager);

    // Wait for validators to initialize (they're initialized asynchronously in constructor)
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  describe('TIER 2 Validation with Missing Artifact Loading', () => {
    it('should load missing artifact via client request when TIER 2 validator needs cross-file type', async () => {
      // Test scenario: A class extends a missing superclass that needs to be loaded
      // ClassA.cls: public class ClassA extends MissingSuperClass { }
      // MissingSuperClass.cls: public class MissingSuperClass { }

      const classAContent = `public class ClassA extends MissingSuperClass {
        public ClassA() { }
      }`;

      const missingSuperClassContent = `public class MissingSuperClass {
        public MissingSuperClass() { }
      }`;

      const classAUri = 'file:///ClassA.cls';
      const missingSuperClassUri = 'file:///MissingSuperClass.cls';

      // Create documents
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

      // Setup storage to return ClassA initially, MissingClass after loading
      mockStorage.getDocument
        .mockResolvedValueOnce(classADocument) // First call for ClassA
        .mockResolvedValueOnce(mockStorage.getDocument); // Subsequent calls

      // Mock the client response: client finds and opens MissingSuperClass
      mockConnection.sendRequest.mockImplementation(
        async (method: string, params: any) => {
          if (method === 'apex/findMissingArtifact') {
            // Simulate client finding the missing artifact
            // In real scenario, client would open the file and trigger didOpen
            // For this test, we'll simulate the response and manually process didOpen
            const result: FindMissingArtifactResult = {
              opened: [missingSuperClassUri],
            };

            // Simulate the didOpen processing that happens when client opens file
            // This is what happens in real flow: client opens file → didOpen notification → server compiles
            setTimeout(async () => {
              const symbolTable = new SymbolTable();
              const listener = new FullSymbolCollectorListener(symbolTable);
              compilerService.compile(
                missingSuperClassContent,
                missingSuperClassUri,
                listener,
              );
              await Effect.runPromise(
                symbolManager.addSymbolTable(symbolTable, missingSuperClassUri),
              );
            }, 10);

            return result;
          }
          return null;
        },
      );

      // Process diagnostics for ClassA - this should trigger TIER 2 validation
      const params: DocumentSymbolParams = {
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

      // Wait a bit for async didOpen processing to complete
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify client request was made
      expect(mockConnection.sendRequest).toHaveBeenCalledWith(
        'apex/findMissingArtifact',
        expect.objectContaining({
          identifier: 'MissingSuperClass',
          mode: 'blocking',
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
      expect(missingSuperClassSymbols[0].kind).toBe('Class');

      // Verify diagnostics were processed (may or may not have errors depending on type compatibility)
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle missing artifact not found scenario', async () => {
      const classAContent = `public class ClassA extends NonExistentSuperClass {
        public ClassA() { }
      }`;

      const classAUri = 'file:///ClassA.cls';
      const classADocument = TextDocument.create(
        classAUri,
        'apex',
        1,
        classAContent,
      );

      mockStorage.getDocument.mockResolvedValue(classADocument);

      // Mock client response: artifact not found
      mockConnection.sendRequest.mockResolvedValue({
        notFound: true,
      });

      const params: DocumentSymbolParams = {
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
      const classAContent = `public class ClassA extends MissingSuperClass {
        public ClassA() { }
      }`;

      const classAUri = 'file:///ClassA.cls';
      const classADocument = TextDocument.create(
        classAUri,
        'apex',
        1,
        classAContent,
      );

      mockStorage.getDocument.mockResolvedValue(classADocument);

      // Disable artifact loading
      mockSettingsManager.getSettings.mockReturnValue({
        apex: {
          findMissingArtifact: {
            enabled: false,
          },
        },
      });

      const params: DocumentSymbolParams = {
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
      const classAContent = `public class ClassA extends MissingClass1 {
        public ClassA() { }
      }`;

      const missingClass1Content = `public class MissingClass1 extends MissingClass2 {
        public MissingClass1() { }
      }`;

      const missingClass2Content = `public class MissingClass2 {
        public MissingClass2() { }
      }`;

      const classAUri = 'file:///ClassA.cls';
      const missingClass1Uri = 'file:///MissingClass1.cls';
      const missingClass2Uri = 'file:///MissingClass2.cls';

      const classADocument = TextDocument.create(
        classAUri,
        'apex',
        1,
        classAContent,
      );

      mockStorage.getDocument.mockResolvedValue(classADocument);

      let _callCount = 0;
      mockConnection.sendRequest.mockImplementation(
        async (method: string, params: any) => {
          if (method === 'apex/findMissingArtifact') {
            _callCount++;
            const identifier = params.identifier;

            if (identifier === 'MissingClass1') {
              // First artifact found
              setTimeout(async () => {
                const symbolTable = new SymbolTable();
                const listener = new FullSymbolCollectorListener(symbolTable);
                compilerService.compile(
                  missingClass1Content,
                  missingClass1Uri,
                  listener,
                );
                await Effect.runPromise(
                  symbolManager.addSymbolTable(symbolTable, missingClass1Uri),
                );
              }, 10);

              return { opened: [missingClass1Uri] };
            } else if (identifier === 'MissingClass2') {
              // Second artifact found (when MissingClass1 is validated and needs MissingClass2)
              setTimeout(async () => {
                const symbolTable = new SymbolTable();
                const listener = new FullSymbolCollectorListener(symbolTable);
                compilerService.compile(
                  missingClass2Content,
                  missingClass2Uri,
                  listener,
                );
                await Effect.runPromise(
                  symbolManager.addSymbolTable(symbolTable, missingClass2Uri),
                );
              }, 10);

              return { opened: [missingClass2Uri] };
            }

            return { notFound: true };
          }
          return null;
        },
      );

      const params: DocumentSymbolParams = {
        textDocument: { uri: classAUri },
      };

      const result = await service.processDiagnostic(params);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 200));

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
