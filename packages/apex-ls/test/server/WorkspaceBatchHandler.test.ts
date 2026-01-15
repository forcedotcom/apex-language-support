/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  handleWorkspaceBatchRequest,
  handleProcessWorkspaceBatchesRequest,
  clearBatchStorage,
  clearCleanupInterval,
} from '../../src/server/WorkspaceBatchHandler';
import { SendWorkspaceBatchParams } from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';
import {
  shutdown as schedulerShutdown,
  reset as schedulerReset,
} from '@salesforce/apex-lsp-parser-ast';

// Mock dependencies
jest.mock('@salesforce/apex-lsp-shared', () => ({
  getLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

jest.mock('@salesforce/apex-lsp-parser-ast', () => ({
  createQueuedItem: jest.fn((eff: any) =>
    Effect.succeed({ id: 'mock', eff, fiberDeferred: {} } as any),
  ),
  offer: jest.fn(() => Effect.succeed({ fiber: Effect.void } as any)),
  Priority: {
    Low: 4,
  },
  SchedulerInitializationService: {
    getInstance: jest.fn(() => ({
      ensureInitialized: jest.fn(() => Promise.resolve()),
      isInitialized: jest.fn(() => true),
    })),
  },
}));

jest.mock('@salesforce/apex-lsp-compliant-services', () => ({
  DocumentProcessingService: jest.fn().mockImplementation(() => ({
    processDocumentOpenBatch: jest.fn().mockResolvedValue([]),
  })),
}));

describe('WorkspaceBatchHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear batch storage between tests
    clearBatchStorage();
    // Clear cleanup interval to prevent it from keeping process alive
    clearCleanupInterval();
  });

  afterEach(async () => {
    // Wait for any async operations (like Effect.forkDaemon) to complete
    // This ensures daemon fibers have time to finish before next test
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    // Clear cleanup interval
    clearCleanupInterval();

    // Wait for any pending async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Shutdown the scheduler first to stop the background loop
    try {
      await Effect.runPromise(schedulerShutdown());
    } catch (_error) {
      // Ignore errors - scheduler might not be initialized or already shut down
    }
    // Reset scheduler state after shutdown
    try {
      await Effect.runPromise(schedulerReset());
    } catch (_error) {
      // Ignore errors - scheduler might not be initialized
    }

    // Give Effect-TS resources time to clean up
    // This allows fibers to complete their cleanup
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  const createMockBatchParams = (
    batchIndex: number,
    totalBatches: number,
    fileCount: number = 10,
  ): SendWorkspaceBatchParams => ({
    batchIndex,
    totalBatches,
    isLastBatch: batchIndex === totalBatches - 1,
    compressedData: 'dGVzdCBkYXRh', // base64 encoded "test data"
    fileMetadata: Array.from({ length: fileCount }, (_, i) => ({
      uri: `file:///test${i}.cls`,
      version: 1,
    })),
  });

  describe('handleWorkspaceBatchRequest', () => {
    it('should store single batch and return success', async () => {
      const params = createMockBatchParams(0, 1, 5);
      const result = await handleWorkspaceBatchRequest(params);

      expect(result.success).toBe(true);
      expect(result.stored).toBe(true);
      expect(result.enqueuedCount).toBe(5);
      expect(result.receivedCount).toBe(1);
      expect(result.totalBatches).toBe(1);
    });

    it('should store multiple batches and return progress', async () => {
      const totalBatches = 3;
      const batches: SendWorkspaceBatchParams[] = [];

      // Send batches out of order to test ordering
      batches.push(createMockBatchParams(1, totalBatches, 10));
      batches.push(createMockBatchParams(0, totalBatches, 10));
      batches.push(createMockBatchParams(2, totalBatches, 10)); // Last batch

      // Send all batches
      const results = [];
      for (const batch of batches) {
        const result = await handleWorkspaceBatchRequest(batch);
        results.push(result);
      }

      // Verify all succeeded
      expect(results.every((r) => r.success)).toBe(true);
      expect(results.every((r) => r.stored)).toBe(true);
      // Last batch should show all received
      expect(results[2].receivedCount).toBe(3);
    });

    it('should handle batches arriving out of order', async () => {
      const totalBatches = 5;
      const batches: SendWorkspaceBatchParams[] = [];

      // Create batches in reverse order
      for (let i = totalBatches - 1; i >= 0; i--) {
        batches.push(createMockBatchParams(i, totalBatches, 5));
      }

      // Send batches
      const results = [];
      for (const batch of batches) {
        const result = await handleWorkspaceBatchRequest(batch);
        results.push(result);
      }

      // Verify all succeeded
      expect(results.every((r) => r.success)).toBe(true);
      // Last batch (index 0) should show all received
      expect(results[totalBatches - 1].receivedCount).toBe(totalBatches);
    });

    it('should handle error gracefully', async () => {
      // Create invalid params that might cause errors
      const invalidParams = {
        batchIndex: 0,
        totalBatches: 1,
        isLastBatch: true,
        compressedData: '', // Empty data
        fileMetadata: [],
      } as SendWorkspaceBatchParams;

      // Should not throw, but may return error
      const result = await handleWorkspaceBatchRequest(invalidParams);
      expect(result).toBeDefined();
    });
  });

  describe('handleProcessWorkspaceBatchesRequest', () => {
    it('should process stored batches when all received', async () => {
      const totalBatches = 2;

      // Store batches first
      await handleWorkspaceBatchRequest(
        createMockBatchParams(0, totalBatches, 5),
      );
      await handleWorkspaceBatchRequest(
        createMockBatchParams(1, totalBatches, 5),
      );

      // Trigger processing
      const result = await handleProcessWorkspaceBatchesRequest({
        totalBatches,
      });

      expect(result.success).toBe(true);

      // Give time for async processing to start
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it('should fail if batches not all received', async () => {
      const totalBatches = 3;

      // Store only one batch
      await handleWorkspaceBatchRequest(
        createMockBatchParams(0, totalBatches, 5),
      );

      // Try to trigger processing (should fail)
      const result = await handleProcessWorkspaceBatchesRequest({
        totalBatches,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
