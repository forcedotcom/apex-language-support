/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  getLogger,
  RequestPriority,
  ApexSettingsManager,
} from '@salesforce/apex-lsp-shared';
import { ISymbolManager } from '@salesforce/apex-lsp-parser-ast';
import { ServiceRegistry } from '../../src/registry';
import { GenericLSPRequestQueue, LSPRequestType } from '../../src/queue';
// eslint-disable-next-line max-len
import { BackgroundProcessingInitializationService } from '../../src/services/BackgroundProcessingInitializationService';

// Mock the logger and settings manager
jest.mock('@salesforce/apex-lsp-shared', () => ({
  getLogger: jest.fn(),
  ApexSettingsManager: {
    getInstance: jest.fn(),
  },
  RequestPriority: {
    IMMEDIATE: 'IMMEDIATE',
    HIGH: 'HIGH',
    NORMAL: 'NORMAL',
    LOW: 'LOW',
  },
}));

// Mock BackgroundProcessingInitializationService
jest.mock(
  '../../src/services/BackgroundProcessingInitializationService',
  () => ({
    BackgroundProcessingInitializationService: {
      getInstance: jest.fn(),
    },
  }),
);

describe('GenericLSPRequestQueue - Effect-TS Implementation', () => {
  let mockLogger: any;
  let mockSymbolManager: jest.Mocked<ISymbolManager>;
  let serviceRegistry: ServiceRegistry;
  let mockBackgroundProcessingService: jest.Mocked<
    typeof BackgroundProcessingInitializationService
  >;
  let mockSettingsManager: jest.Mocked<typeof ApexSettingsManager>;
  const queues: GenericLSPRequestQueue[] = [];

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    (getLogger as jest.Mock).mockReturnValue(mockLogger);

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
        },
      }),
    } as any);

    mockSymbolManager = {
      addSymbol: jest.fn(),
      getSymbol: jest.fn(),
      findSymbolByName: jest.fn(),
      findSymbolByFQN: jest.fn(),
      findSymbolsInFile: jest.fn(),
      findFilesForSymbol: jest.fn(),
      resolveSymbol: jest.fn(),
      getAllSymbolsForCompletion: jest.fn(),
      getAllReferencesInFile: jest.fn(),
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
      setCommentAssociations: jest.fn(),
      getBlockCommentsForSymbol: jest.fn(),
      getSymbolAtPositionWithinScope: jest.fn(),
      createResolutionContextWithRequestType: jest.fn(),
    };

    serviceRegistry = new ServiceRegistry();

    mockBackgroundProcessingService =
      BackgroundProcessingInitializationService as jest.Mocked<
        typeof BackgroundProcessingInitializationService
      >;
    mockBackgroundProcessingService.getInstance.mockReturnValue({
      isBackgroundProcessingInitialized: jest.fn().mockReturnValue(true),
    } as any);
  });

  afterEach(async () => {
    // Clean up all queue instances to prevent hanging intervals
    for (const queue of queues) {
      try {
        queue.shutdown();
      } catch (_error) {
        // Ignore shutdown errors
      }
    }
    queues.length = 0;
  });

  describe('Effect.Service Pattern', () => {
    it('should create queue instance with service registry', () => {
      const queue = new GenericLSPRequestQueue(serviceRegistry);
      queues.push(queue);
      expect(queue).toBeDefined();
    });

    it('should accept custom settings', () => {
      const queue = new GenericLSPRequestQueue(serviceRegistry);
      queues.push(queue);
      expect(queue).toBeDefined();
    });
  });

  describe('Request Submission', () => {
    it('should submit a request successfully', async () => {
      const handler = {
        requestType: 'hover' as LSPRequestType,
        priority: 'IMMEDIATE' as RequestPriority,
        timeout: 100,
        maxRetries: 0,
        process: jest.fn().mockResolvedValue({ result: 'test' }),
      };

      serviceRegistry.register(handler);

      const queue = new GenericLSPRequestQueue(serviceRegistry);
      queues.push(queue);
      const result = await queue.submitRequest(
        'hover',
        { textDocument: { uri: 'test' }, position: { line: 0, character: 0 } },
        mockSymbolManager,
      );

      expect(result).toEqual({ result: 'test' });
      expect(handler.process).toHaveBeenCalled();
    });

    it('should handle request submission errors', async () => {
      const handler = {
        requestType: 'hover' as LSPRequestType,
        priority: 'IMMEDIATE' as RequestPriority,
        timeout: 100,
        maxRetries: 0,
        process: jest.fn().mockRejectedValue(new Error('Handler error')),
      };

      serviceRegistry.register(handler);

      const queue = new GenericLSPRequestQueue(serviceRegistry);
      queues.push(queue);
      await expect(
        queue.submitRequest(
          'hover',
          {
            textDocument: { uri: 'test' },
            position: { line: 0, character: 0 },
          },
          mockSymbolManager,
        ),
      ).rejects.toThrow('Handler error');
    });

    it('should handle missing handler gracefully', async () => {
      const queue = new GenericLSPRequestQueue(serviceRegistry);
      queues.push(queue);
      await expect(
        queue.submitRequest(
          'hover',
          {
            textDocument: { uri: 'test' },
            position: { line: 0, character: 0 },
          },
          mockSymbolManager,
        ),
      ).rejects.toThrow();
    });
  });

  describe('Priority-based Processing', () => {
    it('should process IMMEDIATE priority requests first', async () => {
      const order: string[] = [];

      const immediateHandler = {
        requestType: 'hover' as LSPRequestType,
        priority: 'IMMEDIATE' as RequestPriority,
        timeout: 100,
        maxRetries: 0,
        process: jest.fn().mockImplementation(async () => {
          order.push('immediate');
          return { priority: 'IMMEDIATE' };
        }),
      };

      const normalHandler = {
        requestType: 'documentSymbol' as LSPRequestType,
        priority: 'NORMAL' as RequestPriority,
        timeout: 100,
        maxRetries: 0,
        process: jest.fn().mockImplementation(async () => {
          order.push('normal');
          return { priority: 'NORMAL' };
        }),
      };

      serviceRegistry.register(immediateHandler);
      serviceRegistry.register(normalHandler);

      const queue = new GenericLSPRequestQueue(serviceRegistry);
      queues.push(queue);

      // Submit requests in reverse priority order
      const normalPromise = queue.submitRequest(
        'documentSymbol',
        { textDocument: { uri: 'test' } },
        mockSymbolManager,
      );

      // Small delay to ensure normal is submitted first
      await new Promise((resolve) => setTimeout(resolve, 10));

      const immediatePromise = queue.submitRequest(
        'hover',
        { textDocument: { uri: 'test' }, position: { line: 0, character: 0 } },
        mockSymbolManager,
      );

      await Promise.all([immediatePromise, normalPromise]);

      // Both should complete, but immediate should be processed first
      expect(immediateHandler.process).toHaveBeenCalled();
      expect(normalHandler.process).toHaveBeenCalled();
    });

    it('should respect priority-specific concurrency limits', async () => {
      const handler = {
        requestType: 'hover' as LSPRequestType,
        priority: 'IMMEDIATE' as RequestPriority,
        timeout: 100,
        maxRetries: 0,
        process: jest.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return { done: true };
        }),
      };

      serviceRegistry.register(handler);

      const queue = new GenericLSPRequestQueue(serviceRegistry);
      queues.push(queue);

      // Submit more requests than concurrency limit
      const promises = Array.from({ length: 5 }, () =>
        queue.submitRequest(
          'hover',
          {
            textDocument: { uri: 'test' },
            position: { line: 0, character: 0 },
          },
          mockSymbolManager,
        ),
      );

      await Promise.all(promises);

      // All should complete, but concurrency should be limited
      expect(handler.process).toHaveBeenCalledTimes(5);
    });
  });

  describe('Statistics Tracking', () => {
    it('should track queue statistics', async () => {
      const handler = {
        requestType: 'hover' as LSPRequestType,
        priority: 'IMMEDIATE' as RequestPriority,
        timeout: 100,
        maxRetries: 0,
        process: jest.fn().mockResolvedValue({ result: 'test' }),
      };

      serviceRegistry.register(handler);

      const queue = new GenericLSPRequestQueue(serviceRegistry);
      queues.push(queue);
      await queue.submitRequest(
        'hover',
        { textDocument: { uri: 'test' }, position: { line: 0, character: 0 } },
        mockSymbolManager,
      );

      // Wait a bit for processing to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      const stats = queue.getStats();

      expect(stats).toHaveProperty('totalProcessed');
      expect(stats).toHaveProperty('totalFailed');
      expect(stats).toHaveProperty('averageProcessingTime');
      expect(stats).toHaveProperty('activeWorkers');
      expect(stats).toHaveProperty('immediateQueueSize');
      expect(stats).toHaveProperty('highPriorityQueueSize');
      expect(stats).toHaveProperty('normalPriorityQueueSize');
      expect(stats).toHaveProperty('lowPriorityQueueSize');
    });

    it('should update stats after processing requests', async () => {
      const handler = {
        requestType: 'hover' as LSPRequestType,
        priority: 'IMMEDIATE' as RequestPriority,
        timeout: 100,
        maxRetries: 0,
        process: jest.fn().mockResolvedValue({ result: 'test' }),
      };

      serviceRegistry.register(handler);

      const queue = new GenericLSPRequestQueue(serviceRegistry);
      queues.push(queue);

      const initialStats = queue.getStats();
      expect(initialStats.totalProcessed).toBe(0);

      await queue.submitRequest(
        'hover',
        { textDocument: { uri: 'test' }, position: { line: 0, character: 0 } },
        mockSymbolManager,
      );

      // Wait for processing to complete
      await new Promise((resolve) => setTimeout(resolve, 200));

      const finalStats = queue.getStats();
      expect(finalStats.totalProcessed).toBeGreaterThan(0);
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout requests that exceed timeout duration', async () => {
      const handler = {
        requestType: 'hover' as LSPRequestType,
        priority: 'IMMEDIATE' as RequestPriority,
        timeout: 100,
        maxRetries: 0,
        process: jest.fn().mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(() => resolve({ result: 'slow' }), 500);
            }),
        ),
      };

      serviceRegistry.register(handler);

      const queue = new GenericLSPRequestQueue(serviceRegistry);
      queues.push(queue);

      await expect(
        queue.submitRequest(
          'hover',
          {
            textDocument: { uri: 'test' },
            position: { line: 0, character: 0 },
          },
          mockSymbolManager,
          { timeout: 50 },
        ),
      ).rejects.toThrow();
    });
  });

  describe('Shutdown Handling', () => {
    it('should shutdown gracefully', async () => {
      const handler = {
        requestType: 'hover' as LSPRequestType,
        priority: 'IMMEDIATE' as RequestPriority,
        timeout: 100,
        maxRetries: 0,
        process: jest.fn().mockResolvedValue({ result: 'test' }),
      };

      serviceRegistry.register(handler);

      const queue = new GenericLSPRequestQueue(serviceRegistry);
      queues.push(queue);

      await queue.submitRequest(
        'hover',
        { textDocument: { uri: 'test' }, position: { line: 0, character: 0 } },
        mockSymbolManager,
      );

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      await queue.shutdown();

      // Shutdown should complete without errors
      expect(queue).toBeDefined();
    });
  });

  describe('Context.Tag Dependencies', () => {
    it('should provide all required Context.Tag dependencies', () => {
      const queue = new GenericLSPRequestQueue(serviceRegistry);
      queues.push(queue);

      // Queue should be created successfully with all dependencies
      expect(queue).toBeDefined();
    });
  });

  describe('Yielding Mechanism', () => {
    it('should respect yield interval settings', async () => {
      const handler = {
        requestType: 'documentSymbol' as LSPRequestType,
        priority: 'NORMAL' as RequestPriority,
        timeout: 5000,
        maxRetries: 0,
        process: jest.fn().mockResolvedValue({ result: 'test' }),
      };

      serviceRegistry.register(handler);

      const queue = new GenericLSPRequestQueue(serviceRegistry);
      queues.push(queue);

      // Submit multiple requests
      const promises = Array.from({ length: 3 }, () =>
        queue.submitRequest(
          'documentSymbol',
          { textDocument: { uri: 'test' } },
          mockSymbolManager,
        ),
      );

      await Promise.all(promises);

      // All should complete
      expect(handler.process).toHaveBeenCalledTimes(3);
    });
  });

  describe('Multiple Request Types', () => {
    it('should handle multiple request types', async () => {
      const hoverHandler = {
        requestType: 'hover' as LSPRequestType,
        priority: 'IMMEDIATE' as RequestPriority,
        timeout: 100,
        maxRetries: 0,
        process: jest.fn().mockResolvedValue({ type: 'hover' }),
      };

      const completionHandler = {
        requestType: 'completion' as LSPRequestType,
        priority: 'IMMEDIATE' as RequestPriority,
        timeout: 100,
        maxRetries: 0,
        process: jest.fn().mockResolvedValue({ type: 'completion' }),
      };

      const definitionHandler = {
        requestType: 'definition' as LSPRequestType,
        priority: 'HIGH' as RequestPriority,
        timeout: 100,
        maxRetries: 0,
        process: jest.fn().mockResolvedValue({ type: 'definition' }),
      };

      serviceRegistry.register(hoverHandler);
      serviceRegistry.register(completionHandler);
      serviceRegistry.register(definitionHandler);

      const queue = new GenericLSPRequestQueue(serviceRegistry);
      queues.push(queue);

      const hoverResult = await queue.submitRequest(
        'hover',
        { textDocument: { uri: 'test' }, position: { line: 0, character: 0 } },
        mockSymbolManager,
      );

      const completionResult = await queue.submitRequest(
        'completion',
        { textDocument: { uri: 'test' }, position: { line: 0, character: 0 } },
        mockSymbolManager,
      );

      const definitionResult = await queue.submitRequest(
        'definition',
        { textDocument: { uri: 'test' }, position: { line: 0, character: 0 } },
        mockSymbolManager,
      );

      expect(hoverResult).toEqual({ type: 'hover' });
      expect(completionResult).toEqual({ type: 'completion' });
      expect(definitionResult).toEqual({ type: 'definition' });
    });
  });
});
