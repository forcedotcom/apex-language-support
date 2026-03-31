/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { TextDocumentChangeEvent } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import {
  DocumentChangeBatcher,
  ChangeProcessor,
} from '../../src/services/DocumentChangeBatcher';

describe('DocumentChangeBatcher', () => {
  let mockLogger: any;
  let processor: jest.MockedFunction<ChangeProcessor>;
  let batcher: DocumentChangeBatcher;

  beforeEach(() => {
    jest.useFakeTimers();

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    processor = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    batcher?.dispose();
    jest.useRealTimers();
  });

  const createMockEvent = (
    uri: string,
    version: number,
  ): TextDocumentChangeEvent<TextDocument> =>
    ({
      document: {
        uri,
        languageId: 'apex',
        version,
        lineCount: 10,
        getText: jest.fn().mockReturnValue(''),
        positionAt: jest.fn(),
        offsetAt: jest.fn(),
      } as unknown as TextDocument,
    }) as TextDocumentChangeEvent<TextDocument>;

  describe('Debounce collapses', () => {
    it('should call processor once with latest version after multiple enqueues for same URI', () => {
      batcher = new DocumentChangeBatcher(mockLogger, processor, {
        debounceMs: 100,
      });

      // Enqueue 5 events for the same URI with increasing versions
      for (let v = 1; v <= 5; v++) {
        batcher.enqueue(createMockEvent('file:///test.cls', v));
      }

      // Advance past debounce window
      jest.advanceTimersByTime(150);

      expect(processor).toHaveBeenCalledTimes(1);
      expect(processor.mock.calls[0][0].document.version).toBe(5);
    });
  });

  describe('Stale version ignored', () => {
    it('should ignore stale version enqueued after a newer version', () => {
      batcher = new DocumentChangeBatcher(mockLogger, processor, {
        debounceMs: 100,
      });

      // Enqueue v3 first, then v2 (out-of-order / stale)
      batcher.enqueue(createMockEvent('file:///test.cls', 3));
      batcher.enqueue(createMockEvent('file:///test.cls', 2));

      jest.advanceTimersByTime(150);

      expect(processor).toHaveBeenCalledTimes(1);
      // Only v3 should be processed (v2 was stale)
      expect(processor.mock.calls[0][0].document.version).toBe(3);
    });
  });

  describe('Per-URI independence', () => {
    it('should process events for different URIs independently', () => {
      batcher = new DocumentChangeBatcher(mockLogger, processor, {
        debounceMs: 100,
      });

      batcher.enqueue(createMockEvent('file:///a.cls', 1));
      batcher.enqueue(createMockEvent('file:///b.cls', 1));

      jest.advanceTimersByTime(150);

      expect(processor).toHaveBeenCalledTimes(2);

      const processedUris = processor.mock.calls.map(
        (call) => call[0].document.uri,
      );
      expect(processedUris).toContain('file:///a.cls');
      expect(processedUris).toContain('file:///b.cls');
    });
  });

  describe('flushAll', () => {
    it('should process all pending events immediately', () => {
      batcher = new DocumentChangeBatcher(mockLogger, processor, {
        debounceMs: 100,
      });

      batcher.enqueue(createMockEvent('file:///a.cls', 1));
      batcher.enqueue(createMockEvent('file:///b.cls', 2));

      // Flush before debounce fires
      batcher.flushAll();

      expect(processor).toHaveBeenCalledTimes(2);

      // Advancing timers should NOT cause additional calls (timers were cleared)
      jest.advanceTimersByTime(200);
      expect(processor).toHaveBeenCalledTimes(2);
    });
  });

  describe('dispose', () => {
    it('should cancel all pending events and not process them', () => {
      batcher = new DocumentChangeBatcher(mockLogger, processor, {
        debounceMs: 100,
      });

      batcher.enqueue(createMockEvent('file:///a.cls', 1));
      batcher.enqueue(createMockEvent('file:///b.cls', 2));

      batcher.dispose();

      // Advancing timers should NOT process anything
      jest.advanceTimersByTime(200);
      expect(processor).not.toHaveBeenCalled();
    });
  });

  describe('processor error handling', () => {
    it('should log errors from processor without throwing', () => {
      processor.mockRejectedValueOnce(new Error('parse failed'));

      batcher = new DocumentChangeBatcher(mockLogger, processor, {
        debounceMs: 100,
      });

      batcher.enqueue(createMockEvent('file:///test.cls', 1));

      jest.advanceTimersByTime(150);

      expect(processor).toHaveBeenCalledTimes(1);
      // Error is logged but doesn't propagate
    });
  });

  describe('concurrency limit', () => {
    it('should limit concurrent processor calls to maxConcurrentParses', async () => {
      // Use real timers for this test since we need promise resolution
      jest.useRealTimers();

      let concurrentCount = 0;
      let maxObservedConcurrent = 0;
      const resolvers: Array<() => void> = [];

      // Create a processor that blocks until manually resolved
      const blockingProcessor: ChangeProcessor = jest.fn(() => {
        concurrentCount++;
        if (concurrentCount > maxObservedConcurrent) {
          maxObservedConcurrent = concurrentCount;
        }
        return new Promise<void>((resolve) => {
          resolvers.push(() => {
            concurrentCount--;
            resolve();
          });
        });
      });

      batcher = new DocumentChangeBatcher(mockLogger, blockingProcessor, {
        debounceMs: 0, // No debounce for this test
        maxConcurrentParses: 2,
      });

      // Enqueue 5 different URIs
      for (let i = 0; i < 5; i++) {
        batcher.enqueue(createMockEvent(`file:///test${i}.cls`, 1));
      }

      // Wait for debounce timers to fire
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Only maxConcurrentParses (2) should be running
      expect(concurrentCount).toBe(2);
      expect(blockingProcessor).toHaveBeenCalledTimes(2);

      // Resolve one — should trigger the next queued flush
      resolvers[0]();
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(blockingProcessor).toHaveBeenCalledTimes(3);
      expect(concurrentCount).toBe(2); // Still limited to 2

      // Resolve remaining
      while (resolvers.length > 0) {
        resolvers.shift()!();
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      expect(blockingProcessor).toHaveBeenCalledTimes(5);
      expect(maxObservedConcurrent).toBe(2);

      // Switch back to fake timers for afterEach
      jest.useFakeTimers();
    });

    it('should not limit when under the concurrency cap', () => {
      batcher = new DocumentChangeBatcher(mockLogger, processor, {
        debounceMs: 100,
        maxConcurrentParses: 10,
      });

      // Enqueue 3 URIs — well under the cap of 10
      for (let i = 0; i < 3; i++) {
        batcher.enqueue(createMockEvent(`file:///test${i}.cls`, 1));
      }

      jest.advanceTimersByTime(150);

      // All 3 should be processed immediately (no queuing)
      expect(processor).toHaveBeenCalledTimes(3);
    });
  });
});
