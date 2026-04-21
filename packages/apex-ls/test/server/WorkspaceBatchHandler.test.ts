/*
 * Copyright (c) 2026, salesforce.com, inc.
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
  setBatchIngestionDispatcher,
  getBatchIngestionDispatcher,
  setCrossFileEnrichmentDispatcher,
  getCrossFileEnrichmentDispatcher,
} from '../../src/server/WorkspaceBatchHandler';
import { SendWorkspaceBatchParams } from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';
import {
  shutdown as schedulerShutdown,
  reset as schedulerReset,
} from '@salesforce/apex-lsp-parser-ast';

// Mock dependencies
const mockGetSettings = jest.fn(() => ({
  apex: {
    deferredReferenceProcessing: {
      enableCrossFileDeferral: false,
    },
  },
}));

jest.mock('@salesforce/apex-lsp-shared', () => ({
  getLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
  ApexSettingsManager: {
    getInstance: jest.fn(() => ({
      getSettings: mockGetSettings,
    })),
  },
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

  // ---------------------------------------------------------------------------
  // Step 8 — Batch ingestion dispatcher
  // ---------------------------------------------------------------------------

  // Worker batch dispatch is Node-only (coordinator thread, never browser).
  // fflate crashes in jsdom because setup-web.js reassigns TextDecoder.
  const isJsdom =
    typeof navigator !== 'undefined' && /jsdom/.test(navigator.userAgent);

  (isJsdom ? describe.skip : describe)(
    'batch ingestion dispatcher (Step 8)',
    () => {
      /**
       * Build valid compressed batch data: a ZIP with __metadata.json and
       * one content file per entry.  Uses lazy require to avoid loading
       * fflate at module init time (breaks in jsdom).
       */
      function makeCompressedBatch(
        files: Array<{ uri: string; version: number; content: string }>,
        batchIndex = 0,
        totalBatches = 1,
      ): string {
        const { zipSync: zip, strToU8: s2u } = require('fflate') as {
          zipSync: (data: Record<string, Uint8Array>) => Uint8Array;
          strToU8: (s: string) => Uint8Array;
        };
        const metadata = {
          batchIndex,
          totalBatches,
          isLastBatch: batchIndex === totalBatches - 1,
          fileMetadata: files.map((f) => ({ uri: f.uri, version: f.version })),
        };

        const archive: Record<string, Uint8Array> = {
          '__metadata.json': s2u(JSON.stringify(metadata)),
        };
        for (const f of files) {
          archive[f.uri] = s2u(f.content);
        }
        const zipped = zip(archive);
        return Buffer.from(zipped).toString('base64');
      }

      afterEach(() => {
        setBatchIngestionDispatcher(null);
      });

      it('setBatchIngestionDispatcher / getBatchIngestionDispatcher round-trip', () => {
        expect(getBatchIngestionDispatcher()).toBeNull();
        const fn = jest.fn();
        setBatchIngestionDispatcher(fn);
        expect(getBatchIngestionDispatcher()).toBe(fn);
        setBatchIngestionDispatcher(null);
        expect(getBatchIngestionDispatcher()).toBeNull();
      });

      it('dispatches decoded entries to data-owner when dispatcher is set', async () => {
        const dispatcher = jest.fn().mockResolvedValue({ processedCount: 2 });
        setBatchIngestionDispatcher(dispatcher);

        const compressedData = makeCompressedBatch([
          {
            uri: 'file:///Foo.cls',
            version: 1,
            content: 'public class Foo {}',
          },
          {
            uri: 'file:///Bar.cls',
            version: 1,
            content: 'public class Bar {}',
          },
        ]);

        await handleWorkspaceBatchRequest({
          batchIndex: 0,
          totalBatches: 1,
          isLastBatch: true,
          compressedData,
          fileMetadata: [
            { uri: 'file:///Foo.cls', version: 1 },
            { uri: 'file:///Bar.cls', version: 1 },
          ],
        });

        const result = await handleProcessWorkspaceBatchesRequest({
          totalBatches: 1,
        });
        expect(result.success).toBe(true);

        await new Promise((resolve) => setTimeout(resolve, 200));

        expect(dispatcher).toHaveBeenCalledTimes(1);
        const [sessionId, entries] = dispatcher.mock.calls[0];
        expect(typeof sessionId).toBe('string');
        expect(entries).toHaveLength(2);
        expect(entries[0]).toMatchObject({
          uri: 'file:///Foo.cls',
          content: 'public class Foo {}',
          languageId: 'apex',
          version: 1,
        });
      });

      it('falls back to local processing when no dispatcher is set', async () => {
        const { offer } = jest.requireMock(
          '@salesforce/apex-lsp-parser-ast',
        ) as {
          offer: jest.Mock;
        };
        offer.mockClear();

        const compressedData = makeCompressedBatch([
          { uri: 'file:///A.cls', version: 1, content: 'class A {}' },
        ]);

        await handleWorkspaceBatchRequest({
          batchIndex: 0,
          totalBatches: 1,
          isLastBatch: true,
          compressedData,
          fileMetadata: [{ uri: 'file:///A.cls', version: 1 }],
        });

        const result = await handleProcessWorkspaceBatchesRequest({
          totalBatches: 1,
        });
        expect(result.success).toBe(true);

        await new Promise((resolve) => setTimeout(resolve, 200));

        expect(offer).toHaveBeenCalled();
      });

      it('dispatches all decoded entries from multiple batches to data-owner', async () => {
        const dispatcher = jest.fn().mockResolvedValue({ processedCount: 1 });
        setBatchIngestionDispatcher(dispatcher);

        for (let i = 0; i < 3; i++) {
          const compressedData = makeCompressedBatch(
            [
              {
                uri: `file:///File${i}.cls`,
                version: 1,
                content: `class File${i} {}`,
              },
            ],
            i,
            3,
          );
          await handleWorkspaceBatchRequest({
            batchIndex: i,
            totalBatches: 3,
            isLastBatch: i === 2,
            compressedData,
            fileMetadata: [{ uri: `file:///File${i}.cls`, version: 1 }],
          });
        }

        await handleProcessWorkspaceBatchesRequest({ totalBatches: 3 });
        await new Promise((resolve) => setTimeout(resolve, 300));

        // 3 files < chunk size (100), so all ingested in 1 call
        expect(dispatcher).toHaveBeenCalledTimes(1);
        const [, entries] = dispatcher.mock.calls[0];
        expect(entries).toHaveLength(3);
      });

      it('handles dispatcher rejection gracefully', async () => {
        const dispatcher = jest
          .fn()
          .mockRejectedValue(new Error('Worker died'));
        setBatchIngestionDispatcher(dispatcher);

        const compressedData = makeCompressedBatch([
          { uri: 'file:///Err.cls', version: 1, content: 'class Err {}' },
        ]);

        await handleWorkspaceBatchRequest({
          batchIndex: 0,
          totalBatches: 1,
          isLastBatch: true,
          compressedData,
          fileMetadata: [{ uri: 'file:///Err.cls', version: 1 }],
        });

        const result = await handleProcessWorkspaceBatchesRequest({
          totalBatches: 1,
        });
        expect(result.success).toBe(true);

        await new Promise((resolve) => setTimeout(resolve, 200));
        expect(dispatcher).toHaveBeenCalledTimes(1);
      });
    },
  );

  // ---------------------------------------------------------------------------
  // Cross-file enrichment (deferred reference processing)
  // ---------------------------------------------------------------------------

  const isJsdomEnv =
    typeof navigator !== 'undefined' && /jsdom/.test(navigator.userAgent);

  (isJsdomEnv ? describe.skip : describe)(
    'cross-file enrichment after batch processing',
    () => {
      function makeCompressedBatch(
        files: Array<{ uri: string; version: number; content: string }>,
        batchIndex = 0,
        totalBatches = 1,
      ): string {
        const { zipSync: zip, strToU8: s2u } = require('fflate') as {
          zipSync: (data: Record<string, Uint8Array>) => Uint8Array;
          strToU8: (s: string) => Uint8Array;
        };
        const metadata = {
          batchIndex,
          totalBatches,
          isLastBatch: batchIndex === totalBatches - 1,
          fileMetadata: files.map((f) => ({ uri: f.uri, version: f.version })),
        };
        const archive: Record<string, Uint8Array> = {
          '__metadata.json': s2u(JSON.stringify(metadata)),
        };
        for (const f of files) {
          archive[f.uri] = s2u(f.content);
        }
        const zipped = zip(archive);
        return Buffer.from(zipped).toString('base64');
      }

      const testFiles = [
        { uri: 'file:///A.cls', version: 1, content: 'public class A {}' },
        { uri: 'file:///B.cls', version: 1, content: 'public class B {}' },
        { uri: 'file:///C.cls', version: 1, content: 'public class C {}' },
      ];

      async function storeBatchAndProcess(files = testFiles) {
        const compressedData = makeCompressedBatch(files);
        await handleWorkspaceBatchRequest({
          batchIndex: 0,
          totalBatches: 1,
          isLastBatch: true,
          compressedData,
          fileMetadata: files.map((f) => ({
            uri: f.uri,
            version: f.version,
          })),
        });
        await handleProcessWorkspaceBatchesRequest({ totalBatches: 1 });
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      afterEach(() => {
        setBatchIngestionDispatcher(null);
        setCrossFileEnrichmentDispatcher(null);
        mockGetSettings.mockReturnValue({
          apex: {
            deferredReferenceProcessing: { enableCrossFileDeferral: false },
          },
        });
      });

      it('setCrossFileEnrichmentDispatcher / getCrossFileEnrichmentDispatcher round-trip', () => {
        expect(getCrossFileEnrichmentDispatcher()).toBeNull();
        const fn = jest.fn();
        setCrossFileEnrichmentDispatcher(fn);
        expect(getCrossFileEnrichmentDispatcher()).toBe(fn);
        setCrossFileEnrichmentDispatcher(null);
        expect(getCrossFileEnrichmentDispatcher()).toBeNull();
      });

      it('dispatches enrichment for all workspace files when enableCrossFileDeferral is true', async () => {
        const ingestionDispatcher = jest
          .fn()
          .mockResolvedValue({ processedCount: 3 });
        setBatchIngestionDispatcher(ingestionDispatcher);

        const enrichmentDispatcher = jest
          .fn()
          .mockResolvedValue({ resolved: 3, failed: 0 });
        setCrossFileEnrichmentDispatcher(enrichmentDispatcher);

        mockGetSettings.mockReturnValue({
          apex: {
            deferredReferenceProcessing: { enableCrossFileDeferral: true },
          },
        });

        await storeBatchAndProcess();

        expect(enrichmentDispatcher).toHaveBeenCalledTimes(1);
        const [fileUris] = enrichmentDispatcher.mock.calls[0];
        expect(fileUris).toHaveLength(3);
        expect(fileUris).toEqual(
          expect.arrayContaining([
            'file:///A.cls',
            'file:///B.cls',
            'file:///C.cls',
          ]),
        );
      });

      it('does NOT dispatch enrichment when enableCrossFileDeferral is false', async () => {
        const ingestionDispatcher = jest
          .fn()
          .mockResolvedValue({ processedCount: 3 });
        setBatchIngestionDispatcher(ingestionDispatcher);

        const enrichmentDispatcher = jest
          .fn()
          .mockResolvedValue({ resolved: 0, failed: 0 });
        setCrossFileEnrichmentDispatcher(enrichmentDispatcher);

        mockGetSettings.mockReturnValue({
          apex: {
            deferredReferenceProcessing: { enableCrossFileDeferral: false },
          },
        });

        await storeBatchAndProcess();

        expect(enrichmentDispatcher).not.toHaveBeenCalled();
      });

      it('does NOT dispatch enrichment when no enrichment dispatcher is set', async () => {
        const ingestionDispatcher = jest
          .fn()
          .mockResolvedValue({ processedCount: 3 });
        setBatchIngestionDispatcher(ingestionDispatcher);
        // No setCrossFileEnrichmentDispatcher call

        mockGetSettings.mockReturnValue({
          apex: {
            deferredReferenceProcessing: { enableCrossFileDeferral: true },
          },
        });

        await storeBatchAndProcess();
        // No assertion needed — if it tried to call null, it would throw
      });

      it('handles enrichment dispatcher failure gracefully', async () => {
        const ingestionDispatcher = jest
          .fn()
          .mockResolvedValue({ processedCount: 1 });
        setBatchIngestionDispatcher(ingestionDispatcher);

        const enrichmentDispatcher = jest
          .fn()
          .mockRejectedValue(new Error('Enrichment pool crashed'));
        setCrossFileEnrichmentDispatcher(enrichmentDispatcher);

        mockGetSettings.mockReturnValue({
          apex: {
            deferredReferenceProcessing: { enableCrossFileDeferral: true },
          },
        });

        // Should not throw — error is caught and logged
        await storeBatchAndProcess([testFiles[0]]);

        expect(enrichmentDispatcher).toHaveBeenCalledTimes(1);
      });

      it('does NOT dispatch enrichment on local processing path (no ingestion dispatcher)', async () => {
        // No setBatchIngestionDispatcher — uses local processLocally path
        const enrichmentDispatcher = jest
          .fn()
          .mockResolvedValue({ resolved: 0, failed: 0 });
        setCrossFileEnrichmentDispatcher(enrichmentDispatcher);

        mockGetSettings.mockReturnValue({
          apex: {
            deferredReferenceProcessing: { enableCrossFileDeferral: true },
          },
        });

        await storeBatchAndProcess();

        // Local path doesn't produce a file URI list, so enrichment is skipped
        expect(enrichmentDispatcher).not.toHaveBeenCalled();
      });
    },
  );
});
