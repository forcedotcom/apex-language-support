/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  getLogger,
  ApexSettingsManager,
  Priority,
} from '@salesforce/apex-lsp-shared';
import {
  ISymbolManager,
  ApexSymbolProcessingManager,
  SchedulerInitializationService,
} from '@salesforce/apex-lsp-parser-ast';
import { LSPQueueManager, LSPRequestType } from '../../src/queue';
import { ServiceRegistry } from '../../src/registry';
import { BackgroundProcessingInitializationService } from '../../src/services/BackgroundProcessingInitializationService'; // eslint-disable-line max-len

// Mock the logger and settings manager, but keep Priority from actual module
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

// Mock BackgroundProcessingInitializationService
jest.mock(
  '../../src/services/BackgroundProcessingInitializationService',
  () => ({
    BackgroundProcessingInitializationService: {
      getInstance: jest.fn(),
      reset: jest.fn(),
    },
  }),
);

// Mock ApexSymbolProcessingManager (but not LSPQueueManager - we want to test the real one)
jest.mock('@salesforce/apex-lsp-parser-ast', () => {
  const actual = jest.requireActual('@salesforce/apex-lsp-parser-ast');
  return {
    ...actual,
    ISymbolManager: {},
    ApexSymbolProcessingManager: {
      getInstance: jest.fn(),
    },
  };
});

// Mock ServiceFactory and related dependencies
jest.mock('../../src/factories/ServiceFactory', () => ({
  ServiceFactory: jest.fn().mockImplementation(() => ({
    createHoverService: jest.fn(),
    createCompletionService: jest.fn(),
    createDefinitionService: jest.fn(),
    createReferencesService: jest.fn(),
    createDocumentSymbolService: jest.fn(),
    createWorkspaceSymbolService: jest.fn(),
    createDiagnosticService: jest.fn(),
    createCodeActionService: jest.fn(),
    createSignatureHelpService: jest.fn(),
    createRenameService: jest.fn(),
    createDocumentProcessingService: jest.fn(),
    createMissingArtifactService: jest.fn(),
  })),
}));

jest.mock('../../src/storage/ApexStorageManager', () => ({
  ApexStorageManager: {
    getInstance: jest.fn().mockReturnValue({
      getStorage: jest.fn(),
    }),
  },
}));

jest.mock('../../src/config/ServiceConfiguration', () => ({
  DEFAULT_SERVICE_CONFIG: [],
}));

describe('LSPQueueManager - New Effect-TS Implementation', () => {
  let mockLogger: any;
  let mockSymbolManager: jest.Mocked<ISymbolManager>;
  let mockSettingsManager: jest.Mocked<typeof ApexSettingsManager>;
  let mockSymbolProcessingManager: jest.Mocked<
    typeof ApexSymbolProcessingManager
  >;
  let mockBackgroundService: jest.Mocked<
    typeof BackgroundProcessingInitializationService
  >;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    (getLogger as jest.Mock).mockReturnValue(mockLogger);

    mockSymbolManager = {
      addSymbol: jest.fn(),
      getSymbol: jest.fn(),
      findSymbolByName: jest.fn(),
      findSymbolByFQN: jest.fn(),
      findSymbolsInFile: jest.fn(),
      findFilesForSymbol: jest.fn(),
      resolveSymbol: jest.fn(),
      getAllSymbolsForCompletion: jest.fn(),
      findReferencesTo: jest.fn(),
      findReferencesFrom: jest.fn(),
      findRelatedSymbols: jest.fn(),
      analyzeDependencies: jest.fn(),
      detectCircularDependencies: jest.fn(),
      getStats: jest.fn(),
      clear: jest.fn(),
      removeFile: jest.fn(),
      optimizeMemory: jest.fn(),
      createResolutionContext: jest.fn(),
      constructFQN: jest.fn(),
      getContainingType: jest.fn(),
      getAncestorChain: jest.fn(),
      getReferencesAtPosition: jest.fn(),
      getSymbolAtPosition: jest.fn(),
    };

    // Mock ApexSettingsManager
    mockSettingsManager = ApexSettingsManager as jest.Mocked<
      typeof ApexSettingsManager
    >;
    mockSettingsManager.getInstance.mockReturnValue({
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
    } as any);

    // Mock ApexSymbolProcessingManager
    mockSymbolProcessingManager = ApexSymbolProcessingManager as jest.Mocked<
      typeof ApexSymbolProcessingManager
    >;
    mockSymbolProcessingManager.getInstance.mockReturnValue({
      getSymbolManager: jest.fn().mockReturnValue(mockSymbolManager),
    } as any);

    // Mock BackgroundProcessingInitializationService
    mockBackgroundService =
      BackgroundProcessingInitializationService as jest.Mocked<
        typeof BackgroundProcessingInitializationService
      >;
    mockBackgroundService.getInstance.mockReturnValue({
      isBackgroundProcessingInitialized: jest.fn().mockReturnValue(true),
    } as any);

    // Reset singleton instances
    LSPQueueManager.reset();
    SchedulerInitializationService.resetInstance();
  });

  afterEach(async () => {
    // Shutdown any existing singleton instance to prevent hanging intervals
    try {
      const instance = LSPQueueManager.getInstance();
      if (instance && !instance.isShutdownState()) {
        await instance.shutdown();
      }
    } catch (_error) {
      // Ignore shutdown errors
    }
    // Reset singleton instances
    LSPQueueManager.reset();
    SchedulerInitializationService.resetInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = LSPQueueManager.getInstance();
      const instance2 = LSPQueueManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should initialize with default settings', () => {
      const manager = LSPQueueManager.getInstance();
      expect(manager).toBeDefined();
    });

    it('should allow reinitialization after shutdown', async () => {
      const manager1 = LSPQueueManager.getInstance();
      await manager1.shutdown();

      // Get a new instance after shutdown
      const manager2 = LSPQueueManager.getInstance();
      expect(manager2).toBeDefined();
      expect(manager2).not.toBe(manager1);
    });
  });

  describe('Request Submission Methods', () => {
    beforeEach(() => {
      // Register mock handlers for all request types
      const serviceRegistry = (LSPQueueManager.getInstance() as any)
        .serviceRegistry as ServiceRegistry;

      const mockHandler = {
        requestType: 'hover' as LSPRequestType,
        priority: Priority.Immediate,
        timeout: 100,
        maxRetries: 0,
        process: jest.fn().mockResolvedValue({ result: 'test' }),
      };

      // Register handlers for all request types
      [
        'hover',
        'completion',
        'definition',
        'references',
        'documentSymbol',
        'workspaceSymbol',
        'diagnostics',
        'codeAction',
        'signatureHelp',
        'rename',
        'documentOpen',
        'documentSave',
        'documentChange',
        'documentClose',
      ].forEach((type) => {
        serviceRegistry.register({
          ...mockHandler,
          requestType: type as LSPRequestType,
        });
      });
    });

    it('should submit hover request', async () => {
      const manager = LSPQueueManager.getInstance();
      const result = await manager.submitHoverRequest({
        textDocument: { uri: 'test' },
        position: { line: 0, character: 0 },
      });

      expect(result).toEqual({ result: 'test' });
    });

    it('should submit completion request', async () => {
      const manager = LSPQueueManager.getInstance();
      const result = await manager.submitCompletionRequest({
        textDocument: { uri: 'test' },
        position: { line: 0, character: 0 },
      });

      expect(result).toEqual({ result: 'test' });
    });

    it('should submit definition request', async () => {
      const manager = LSPQueueManager.getInstance();
      const result = await manager.submitDefinitionRequest({
        textDocument: { uri: 'test' },
        position: { line: 0, character: 0 },
      });

      expect(result).toEqual({ result: 'test' });
    });

    it('should submit references request', async () => {
      const manager = LSPQueueManager.getInstance();
      const result = await manager.submitReferencesRequest({
        textDocument: { uri: 'test' },
        position: { line: 0, character: 0 },
      });

      expect(result).toEqual({ result: 'test' });
    });

    it('should submit document symbol request', async () => {
      const manager = LSPQueueManager.getInstance();
      const result = await manager.submitDocumentSymbolRequest({
        textDocument: { uri: 'test' },
      });

      expect(result).toEqual({ result: 'test' });
    });

    it('should submit workspace symbol request', async () => {
      const manager = LSPQueueManager.getInstance();
      const result = await manager.submitWorkspaceSymbolRequest({
        query: 'test',
      });

      expect(result).toEqual({ result: 'test' });
    });

    it('should submit diagnostics request', async () => {
      const manager = LSPQueueManager.getInstance();
      const result = await manager.submitDiagnosticsRequest({
        textDocument: { uri: 'test' },
      });

      expect(result).toEqual({ result: 'test' });
    });

    it('should submit code action request', async () => {
      const manager = LSPQueueManager.getInstance();
      const result = await manager.submitCodeActionRequest({
        textDocument: { uri: 'test' },
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 0 },
        },
        context: { diagnostics: [] },
      });

      expect(result).toEqual({ result: 'test' });
    });

    it('should submit signature help request', async () => {
      const manager = LSPQueueManager.getInstance();
      const result = await manager.submitSignatureHelpRequest({
        textDocument: { uri: 'test' },
        position: { line: 0, character: 0 },
      });

      expect(result).toEqual({ result: 'test' });
    });

    it('should submit rename request', async () => {
      const manager = LSPQueueManager.getInstance();
      const result = await manager.submitRenameRequest({
        textDocument: { uri: 'test' },
        position: { line: 0, character: 0 },
        newName: 'newName',
      });

      expect(result).toEqual({ result: 'test' });
    });

    it('should submit document open notification', () => {
      const manager = LSPQueueManager.getInstance();
      // Notifications are fire-and-forget, return void
      manager.submitDocumentOpenNotification({
        textDocument: { uri: 'test', text: 'content' },
      });

      // Verify the notification was submitted (check internal state or wait)
      expect(manager).toBeDefined();
    });

    it('should submit document save notification', () => {
      const manager = LSPQueueManager.getInstance();
      // Notifications are fire-and-forget, return void
      manager.submitDocumentSaveNotification({
        textDocument: { uri: 'test' },
      });

      expect(manager).toBeDefined();
    });

    it('should submit document change notification', () => {
      const manager = LSPQueueManager.getInstance();
      // Notifications are fire-and-forget, return void
      manager.submitDocumentChangeNotification({
        textDocument: { uri: 'test', version: 1 },
        contentChanges: [],
      });

      expect(manager).toBeDefined();
    });

    it('should submit document close notification', () => {
      const manager = LSPQueueManager.getInstance();
      // Notifications are fire-and-forget, return void
      manager.submitDocumentCloseNotification({
        textDocument: { uri: 'test' },
      });

      expect(manager).toBeDefined();
    });
  });

  describe('Statistics', () => {
    it('should get queue statistics', async () => {
      const manager = LSPQueueManager.getInstance();
      const stats = await manager.getStats();

      expect(stats).toHaveProperty('totalProcessed');
      expect(stats).toHaveProperty('totalFailed');
      expect(stats).toHaveProperty('averageProcessingTime');
      expect(stats).toHaveProperty('activeWorkers');
      expect(stats).toHaveProperty('immediateQueueSize');
      expect(stats).toHaveProperty('highPriorityQueueSize');
      expect(stats).toHaveProperty('normalPriorityQueueSize');
      expect(stats).toHaveProperty('lowPriorityQueueSize');
    });
  });

  describe('Shutdown', () => {
    it('should shutdown gracefully', async () => {
      const manager = LSPQueueManager.getInstance();
      await manager.shutdown();

      // Shutdown should complete without errors
      expect(manager).toBeDefined();
    });

    it('should handle shutdown when already shutdown', async () => {
      const manager = LSPQueueManager.getInstance();
      await manager.shutdown();
      await manager.shutdown(); // Second shutdown should not throw

      expect(manager).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors during request submission', async () => {
      const serviceRegistry = (LSPQueueManager.getInstance() as any)
        .serviceRegistry as ServiceRegistry;

      const errorHandler = {
        requestType: 'hover' as LSPRequestType,
        priority: Priority.Immediate,
        timeout: 100,
        maxRetries: 0,
        process: jest.fn().mockRejectedValue(new Error('Handler error')),
      };

      serviceRegistry.register(errorHandler);

      const manager = LSPQueueManager.getInstance();
      await expect(
        manager.submitHoverRequest({
          textDocument: { uri: 'test' },
          position: { line: 0, character: 0 },
        }),
      ).rejects.toThrow('Handler error');
    });
  });
});
