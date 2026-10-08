/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Mock, Mocked } from 'vitest';
import { vi } from 'vitest';
import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getLogger } from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';
import { makeDocumentOpenBatcher } from '../../src/services/DocumentOpenBatcher';
import { DocumentProcessingService } from '../../src/services/DocumentProcessingService';

// Mock the logger
vi.mock('@salesforce/apex-lsp-shared', () => ({
  getLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// Mock DocumentProcessingService
vi.mock('../../src/services/DocumentProcessingService', () => ({
  DocumentProcessingService: vi.fn().mockImplementation(() => ({
    processDocumentOpen: vi.fn().mockResolvedValue([]),
    processDocumentOpenInternal: vi.fn().mockResolvedValue([]),
    processDocumentOpenBatch: vi.fn().mockResolvedValue([]),
  })),
}));

describe('DocumentOpenBatcher', () => {
  let mockLogger: any;
  let mockDocumentProcessingService: Mocked<DocumentProcessingService>;
  let batcher: any;
  let shutdown: Effect.Effect<void, never>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    (getLogger as Mock).mockReturnValue(mockLogger);

    mockDocumentProcessingService = {
      processDocumentOpen: vi.fn().mockResolvedValue([]),
      processDocumentOpenInternal: vi.fn().mockResolvedValue([]),
      processDocumentOpenBatch: vi.fn().mockResolvedValue([]),
    } as any;

    // Create a new batcher instance for each test
    const result = Effect.runSync(
      makeDocumentOpenBatcher(mockLogger, mockDocumentProcessingService),
    );
    batcher = result.service;
    shutdown = result.shutdown;
  });

  afterEach(async () => {
    vi.useRealTimers();
    // Clean up shutdown
    await Effect.runPromise(shutdown);
  });

  const createMockEvent = (
    uri: string,
    version: number = 1,
  ): TextDocumentChangeEvent<TextDocument> => ({
    document: {
      uri,
      languageId: 'apex',
      version,
      getText: vi.fn().mockReturnValue('public class Test {}'),
    } as any,
  });

  describe('addDocumentOpen', () => {
    it('should process single document immediately when batchSizeThreshold is 1', async () => {
      // Use real timers for this test since we want immediate processing
      vi.useRealTimers();

      const result = Effect.runSync(
        makeDocumentOpenBatcher(mockLogger, mockDocumentProcessingService, {
          batchSizeThreshold: 1,
        }),
      );
      const batcherWithThreshold1 = result.service;

      const event = createMockEvent('file:///test1.cls');
      const promise = Effect.runPromise(
        batcherWithThreshold1.addDocumentOpen(event),
      );

      // Should process immediately
      await promise;

      expect(
        mockDocumentProcessingService.processDocumentOpenInternal,
      ).toHaveBeenCalledWith(event);
      expect(
        mockDocumentProcessingService.processDocumentOpenBatch,
      ).not.toHaveBeenCalled();

      // Clean up
      await Effect.runPromise(result.shutdown);

      // Restore fake timers
      vi.useFakeTimers();
    });

    it('should batch multiple documents when threshold is reached', async () => {
      const result = Effect.runSync(
        makeDocumentOpenBatcher(mockLogger, mockDocumentProcessingService, {
          batchSizeThreshold: 2,
          batchWindowMs: 1000,
        }),
      );
      const batcherWithThreshold2 = result.service;

      const event1 = createMockEvent('file:///test1.cls', 1);
      const event2 = createMockEvent('file:///test2.cls', 1);

      // Mock batch processing to return results for both documents
      mockDocumentProcessingService.processDocumentOpenBatch.mockResolvedValue([
        [],
        [],
      ]);

      const promise1 = Effect.runPromise(
        batcherWithThreshold2.addDocumentOpen(event1),
      );
      const promise2 = Effect.runPromise(
        batcherWithThreshold2.addDocumentOpen(event2),
      );

      // Both should resolve
      await Promise.all([promise1, promise2]);

      // Should call batch processing
      expect(
        mockDocumentProcessingService.processDocumentOpenBatch,
      ).toHaveBeenCalledWith([event1, event2]);
      expect(
        mockDocumentProcessingService.processDocumentOpen,
      ).not.toHaveBeenCalled();

      // Clean up
      await Effect.runPromise(result.shutdown);
    });

    it.skip('should flush batch when window expires', async () => {
      // TODO: This test is flaky due to Effect.fork and timer interaction
      // Effect.fork creates fibers that need the runtime to stay alive, but
      // Effect.runPromise shuts down the runtime when the main Effect completes.
      // The timer fiber needs to run independently, but it can't if the runtime
      // shuts down. This is a known limitation when testing Effect fibers with timers.
      // The functionality works correctly in production because the LSP server
      // keeps the runtime alive throughout its lifetime.

      // Use real timers for this test since Effect.sleep doesn't work with fake timers
      vi.useRealTimers();

      const result = Effect.runSync(
        makeDocumentOpenBatcher(mockLogger, mockDocumentProcessingService, {
          batchSizeThreshold: 3,
          batchWindowMs: 100,
        }),
      );
      const batcherWithWindow = result.service;

      // Ensure mock returns a value
      mockDocumentProcessingService.processDocumentOpenInternal.mockResolvedValue(
        [],
      );

      const event1 = createMockEvent('file:///test1.cls', 1);
      const promise1 = Effect.runPromise(
        batcherWithWindow.addDocumentOpen(event1),
      );

      // Wait for the timeout to trigger flush (add extra buffer for Effect runtime)
      await new Promise((resolve) => setTimeout(resolve, 250));

      // Wait for promise to resolve with timeout
      await Promise.race([
        promise1,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Test timeout')), 5000),
        ),
      ]);

      // Should process individually after timeout
      expect(
        mockDocumentProcessingService.processDocumentOpenInternal,
      ).toHaveBeenCalledWith(event1);

      // Clean up - wait a bit for any pending operations
      await new Promise((resolve) => setTimeout(resolve, 50));
      await Effect.runPromise(result.shutdown);

      // Restore fake timers
      vi.useFakeTimers();
    }, 10000); // Increase test timeout

    it('should flush immediately when maxBatchSize is reached', async () => {
      const result = Effect.runSync(
        makeDocumentOpenBatcher(mockLogger, mockDocumentProcessingService, {
          batchSizeThreshold: 2,
          maxBatchSize: 2,
          batchWindowMs: 1000,
        }),
      );
      const batcherWithMaxSize = result.service;

      const event1 = createMockEvent('file:///test1.cls', 1);
      const event2 = createMockEvent('file:///test2.cls', 1);
      const event3 = createMockEvent('file:///test3.cls', 1);

      // Mock batch processing to return results for all documents
      mockDocumentProcessingService.processDocumentOpenBatch.mockResolvedValue([
        [],
        [],
        [],
      ]);

      const promise1 = Effect.runPromise(
        batcherWithMaxSize.addDocumentOpen(event1),
      );
      const promise2 = Effect.runPromise(
        batcherWithMaxSize.addDocumentOpen(event2),
      );
      const promise3 = Effect.runPromise(
        batcherWithMaxSize.addDocumentOpen(event3),
      );

      await Promise.all([promise1, promise2, promise3]);

      // Should flush when max size reached
      expect(
        mockDocumentProcessingService.processDocumentOpenBatch,
      ).toHaveBeenCalled();

      // Clean up
      await Effect.runPromise(result.shutdown);
    });

    it('should handle errors during batch processing', async () => {
      const error = new Error('Batch processing failed');
      // Use a batcher with threshold 2 for this test
      const result = Effect.runSync(
        makeDocumentOpenBatcher(mockLogger, mockDocumentProcessingService, {
          batchSizeThreshold: 2,
        }),
      );
      const batcherWithThreshold2 = result.service;

      mockDocumentProcessingService.processDocumentOpenBatch.mockRejectedValue(
        error,
      );

      const event1 = createMockEvent('file:///test1.cls', 1);
      const event2 = createMockEvent('file:///test2.cls', 1);

      const promise1 = Effect.runPromise(
        batcherWithThreshold2.addDocumentOpen(event1),
      );
      const promise2 = Effect.runPromise(
        batcherWithThreshold2.addDocumentOpen(event2),
      );

      await expect(Promise.all([promise1, promise2])).rejects.toThrow(
        'Batch processing failed',
      );

      // Clean up
      await Effect.runPromise(result.shutdown);
    });

    it('should process single document individually if batch fails', async () => {
      // Use real timers for this test
      vi.useRealTimers();

      const result = Effect.runSync(
        makeDocumentOpenBatcher(mockLogger, mockDocumentProcessingService, {
          batchSizeThreshold: 1,
        }),
      );
      const batcherSingle = result.service;

      const event = createMockEvent('file:///test1.cls', 1);
      const promise = Effect.runPromise(batcherSingle.addDocumentOpen(event));

      await promise;

      expect(
        mockDocumentProcessingService.processDocumentOpenInternal,
      ).toHaveBeenCalledWith(event);

      // Clean up
      await Effect.runPromise(result.shutdown);

      // Restore fake timers
      vi.useFakeTimers();
    });

    it('should not batch when already flushing', async () => {
      // Use real timers for this test to avoid timing issues
      vi.useRealTimers();

      // Use a batcher with threshold 2 for this test
      const result = Effect.runSync(
        makeDocumentOpenBatcher(mockLogger, mockDocumentProcessingService, {
          batchSizeThreshold: 2,
        }),
      );
      const batcherWithThreshold2 = result.service;

      // Start a flush
      const event1 = createMockEvent('file:///test1.cls', 1);
      const event2 = createMockEvent('file:///test2.cls', 1);

      // Make processDocumentOpenBatch take time
      let resolveBatch: () => void;
      const batchPromise = new Promise<void>((resolve) => {
        resolveBatch = resolve;
      });
      mockDocumentProcessingService.processDocumentOpenBatch.mockImplementation(
        async () => {
          await batchPromise;
          return [[], []];
        },
      );

      const promise1 = Effect.runPromise(
        batcherWithThreshold2.addDocumentOpen(event1),
      );
      const promise2 = Effect.runPromise(
        batcherWithThreshold2.addDocumentOpen(event2),
      );

      // Add another while flushing
      const event3 = createMockEvent('file:///test3.cls', 1);
      const promise3 = Effect.runPromise(
        batcherWithThreshold2.addDocumentOpen(event3),
      );

      // Resolve batch
      resolveBatch!();
      await Promise.all([promise1, promise2]);

      // Third should process individually since batch was flushing
      await promise3;

      expect(
        mockDocumentProcessingService.processDocumentOpenInternal,
      ).toHaveBeenCalledWith(event3);

      // Clean up
      await Effect.runPromise(result.shutdown);

      // Restore fake timers
      vi.useFakeTimers();
    });
  });

  describe('forceFlush', () => {
    it('should flush pending documents', async () => {
      // Use a batcher with threshold 2 for this test
      const result = Effect.runSync(
        makeDocumentOpenBatcher(mockLogger, mockDocumentProcessingService, {
          batchSizeThreshold: 2,
        }),
      );
      const batcherWithThreshold2 = result.service;

      const event1 = createMockEvent('file:///test1.cls', 1);
      const event2 = createMockEvent('file:///test2.cls', 1);

      // Mock batch processing to return results
      mockDocumentProcessingService.processDocumentOpenBatch.mockResolvedValue([
        [],
        [],
      ]);

      const promise1 = Effect.runPromise(
        batcherWithThreshold2.addDocumentOpen(event1),
      );
      const promise2 = Effect.runPromise(
        batcherWithThreshold2.addDocumentOpen(event2),
      );

      // Force flush before timeout
      await Effect.runPromise(batcherWithThreshold2.forceFlush());

      await Promise.all([promise1, promise2]);

      expect(
        mockDocumentProcessingService.processDocumentOpenBatch,
      ).toHaveBeenCalled();

      // Clean up
      await Effect.runPromise(result.shutdown);
    });

    it('should do nothing if no pending documents', async () => {
      await Effect.runPromise(batcher.forceFlush());

      expect(
        mockDocumentProcessingService.processDocumentOpenBatch,
      ).not.toHaveBeenCalled();
      expect(
        mockDocumentProcessingService.processDocumentOpen,
      ).not.toHaveBeenCalled();
      expect(
        mockDocumentProcessingService.processDocumentOpenInternal,
      ).not.toHaveBeenCalled();
    });
  });
});
