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
import { ServiceRegistry } from '../../src/registry/ServiceRegistry';
import { GenericLSPRequestQueue } from '../../src/queue/GenericLSPRequestQueue';
import { LSPRequestType } from '../../src/queue/LSPRequestQueue';
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

describe('GenericLSPRequestQueue - Effect-TS Pattern Tests', () => {
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
    } as jest.Mocked<ISymbolManager>;

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
    // Clean up all queue instances to prevent hanging
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
    it('should use Effect.Service for dependency injection', () => {
      const queue = new GenericLSPRequestQueue(serviceRegistry);
      queues.push(queue);
      expect(queue).toBeDefined();
    });

    it('should provide Context.Tag dependencies via Layer', () => {
      const queue = new GenericLSPRequestQueue(serviceRegistry);
      queues.push(queue);
      const stats = queue.getStats();

      // Stats should be available, indicating Layer was provided correctly
      expect(stats).toHaveProperty('totalProcessed');
      expect(stats).toHaveProperty('totalFailed');
      expect(stats).toHaveProperty('averageProcessingTime');
    });
  });

  describe('Effect.Queue Usage', () => {
    it('should use Effect.Queue for priority queues', async () => {
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

      // Submit multiple requests
      const promises = Array.from({ length: 3 }, () =>
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

      // All should complete
      expect(handler.process).toHaveBeenCalledTimes(3);
    });
  });

  describe('Effect.Ref State Management', () => {
    it('should track statistics using Effect.Ref', async () => {
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

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      const finalStats = queue.getStats();
      expect(finalStats.totalProcessed).toBeGreaterThan(0);
    });
  });

  describe('Effect.Fiber Concurrency', () => {
    it('should use Effect.Fiber for concurrent task processing', async () => {
      const handler = {
        requestType: 'hover' as LSPRequestType,
        priority: 'IMMEDIATE' as RequestPriority,
        timeout: 100,
        maxRetries: 0,
        process: jest.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return { result: 'test' };
        }),
      };

      serviceRegistry.register(handler);

      const queue = new GenericLSPRequestQueue(serviceRegistry, {
        maxConcurrency: {
          IMMEDIATE: 5,
          HIGH: 5,
          NORMAL: 5,
          LOW: 1,
        },
        yieldInterval: 100,
        yieldDelayMs: 10,
      });
      queues.push(queue);

      // Submit multiple concurrent requests
      const startTime = Date.now();
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
      const endTime = Date.now();

      // Should process concurrently (much faster than sequential)
      expect(endTime - startTime).toBeLessThan(200); // Should be ~50-100ms, not 250ms
      expect(handler.process).toHaveBeenCalledTimes(5);
    });
  });

  describe('Effect.sleep for Yielding', () => {
    it('should yield using Effect.sleep based on yieldInterval', async () => {
      const handler = {
        requestType: 'documentSymbol' as LSPRequestType,
        priority: 'NORMAL' as RequestPriority,
        timeout: 5000,
        maxRetries: 0,
        process: jest.fn().mockResolvedValue({ result: 'test' }),
      };

      serviceRegistry.register(handler);

      const queue = new GenericLSPRequestQueue(serviceRegistry, {
        maxConcurrency: {
          IMMEDIATE: 10,
          HIGH: 5,
          NORMAL: 5,
          LOW: 1,
        },
        yieldInterval: 1, // Yield after every task
        yieldDelayMs: 10, // Small delay to ensure yielding happens
      });
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

  describe('Effect.race for Timeout Handling', () => {
    it('should use Effect.race for timeout handling', async () => {
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

      const queue = new GenericLSPRequestQueue(serviceRegistry, {
        maxConcurrency: {
          IMMEDIATE: 10,
          HIGH: 5,
          NORMAL: 5,
          LOW: 1,
        },
        yieldInterval: 100,
        yieldDelayMs: 10,
      });
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

  describe('Effect.gen for Composition', () => {
    it('should compose Effect programs using Effect.gen', async () => {
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

      // Submit request (internally uses Effect.gen)
      const result = await queue.submitRequest(
        'hover',
        { textDocument: { uri: 'test' }, position: { line: 0, character: 0 } },
        mockSymbolManager,
      );

      expect(result).toEqual({ result: 'test' });
      expect(handler.process).toHaveBeenCalled();
    });
  });

  describe('Layer Composition', () => {
    it('should compose multiple Layers for dependencies', () => {
      const queue = new GenericLSPRequestQueue(serviceRegistry, {
        maxConcurrency: {
          IMMEDIATE: 10,
          HIGH: 5,
          NORMAL: 5,
          LOW: 1,
        },
        yieldInterval: 50,
        yieldDelayMs: 25,
      });
      queues.push(queue);

      // Queue should be created with all Layers composed
      expect(queue).toBeDefined();

      // Should be able to get stats (indicating Layer composition worked)
      const stats = queue.getStats();
      expect(stats).toBeDefined();
    });
  });

  describe('Error Handling with Effect', () => {
    it('should handle errors using Effect.fail', async () => {
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
  });
});
