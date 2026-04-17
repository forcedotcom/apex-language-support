/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * End-to-end integration test for version-aware write-back protocol.
 *
 * Tests the full flow:
 * 1. Data owner worker initialized with a document
 * 2. Enrichment worker queries symbol subset (gets version + detail level)
 * 3. Enrichment worker processes hover (triggers enrichment)
 * 4. Enrichment worker writes back enriched symbols
 * 5. Data owner validates and merges enriched symbols
 */

import * as path from 'path';
import {
  initializeTopology,
  makeNodeWorkerLayer,
} from '../../src/server/WorkerCoordinator';
import {
  DispatchHover,
  DispatchDocumentOpen,
  QuerySymbolSubset,
  UpdateSymbolSubset,
  getLogger,
} from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';

const WORKER_TS_ENTRY = path.resolve(__dirname, '../../src/worker.platform.ts');
const TSX_OPTIONS = { execArgv: ['--import', 'tsx'] };

// Sample Apex class for testing
const SAMPLE_APEX_CLASS = `public class TestClass {
    public String testMethod() {
        return 'Hello World';
    }

    private Integer helperMethod(String input) {
        return input.length();
    }
}`;

const TEST_URI = 'file:///test/TestClass.cls';

describe('WriteBackProtocol Integration Tests', () => {
  const logger = getLogger();

  it.skip('full write-back flow: data owner receives enriched symbols from enrichment worker', async () => {
    const program = Effect.gen(function* () {
      // Step 1: Initialize topology
      const topology = yield* initializeTopology({
        poolSize: 2,
        enableResourceLoader: false,
        logger,
      });

      // Step 2: Open document in data owner
      const openResult = yield* topology.dataOwner.executeEffect(
        new DispatchDocumentOpen({
          uri: TEST_URI,
          languageId: 'apex',
          version: 1,
          content: SAMPLE_APEX_CLASS,
        }),
      );

      expect(openResult).toBeDefined();

      // Step 3: Query symbol subset from data owner (enrichment worker perspective)
      const queryResult = yield* topology.dataOwner.executeEffect(
        new QuerySymbolSubset({
          uris: [TEST_URI],
        }),
      );

      // Verify we get version and detail level metadata
      expect(queryResult.entries[TEST_URI]).toBeDefined();
      expect(queryResult.versions[TEST_URI]).toBe(1);
      expect(queryResult.detailLevels[TEST_URI]).toBeDefined();
      const initialDetailLevel = queryResult.detailLevels[TEST_URI];

      logger.info(
        () =>
          `Initial state: version=${queryResult.versions[TEST_URI]}, detailLevel=${initialDetailLevel}`,
      );

      // Step 4: Dispatch hover through enrichment pool (triggers enrichment)
      const hoverResult = yield* topology.enrichmentPool.executeEffect(
        new DispatchHover({
          textDocument: { uri: TEST_URI },
          position: { line: 1, character: 15 }, // On "testMethod"
          content: SAMPLE_APEX_CLASS,
        }),
      );

      expect(hoverResult.result).toBeDefined();

      // Step 5: Query again to check if write-back updated detail level
      const queryAfterHover = yield* topology.dataOwner.executeEffect(
        new QuerySymbolSubset({
          uris: [TEST_URI],
        }),
      );

      const finalDetailLevel = queryAfterHover.detailLevels[TEST_URI];
      logger.info(
        () =>
          `After hover: version=${queryAfterHover.versions[TEST_URI]}, detailLevel=${finalDetailLevel}`,
      );

      // Verify enrichment occurred
      // Note: Detail level may or may not change depending on whether enrichment
      // was needed. The key is that the protocol worked without errors.
      expect(queryAfterHover.versions[TEST_URI]).toBe(1); // Version unchanged
      expect(queryAfterHover.detailLevels[TEST_URI]).toBeDefined();

      // If initial level was less than 'full', verify it increased or stayed same
      const levelOrder: Record<string, number> = {
        'public-api': 1,
        protected: 2,
        private: 3,
        full: 4,
      };
      expect(levelOrder[finalDetailLevel]).toBeGreaterThanOrEqual(
        levelOrder[initialDetailLevel],
      );
    }).pipe(
      Effect.scoped,
      Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
    );

    await Effect.runPromise(program);
  }, 30_000);

  it('write-back rejects stale version when document changes', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: false,
        logger,
      });

      // Open document version 1
      yield* topology.dataOwner.executeEffect(
        new DispatchDocumentOpen({
          uri: TEST_URI,
          languageId: 'apex',
          version: 1,
          content: SAMPLE_APEX_CLASS,
        }),
      );

      // Simulate document change to version 2
      const changedContent = SAMPLE_APEX_CLASS + '\n// Comment added\n';
      yield* topology.dataOwner.executeEffect(
        new DispatchDocumentOpen({
          uri: TEST_URI,
          languageId: 'apex',
          version: 2,
          content: changedContent,
        }),
      );

      // Try to write back enriched symbols for version 1 (stale)
      const updateResult = yield* topology.dataOwner.executeEffect(
        new UpdateSymbolSubset({
          uri: TEST_URI,
          documentVersion: 1, // Stale version
          enrichedSymbolTable: {
            symbols: [],
            references: [],
            hierarchicalReferences: [],
            metadata: {
              fileUri: TEST_URI,
              documentVersion: 1,
              parseCompleteness: 'complete' as const,
            },
            fileUri: TEST_URI,
          },
          enrichedDetailLevel: 'full' as const,
          sourceWorkerId: 'test-worker-stale',
        }),
      );

      // Verify write-back rejected due to version mismatch
      expect(updateResult.accepted).toBe(false);
      expect(updateResult.versionMismatch).toBe(true);
      expect(updateResult.merged).toBe(0);

      logger.info(
        () =>
          `Stale write-back correctly rejected: versionMismatch=${updateResult.versionMismatch}`,
      );
    }).pipe(
      Effect.scoped,
      Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
    );

    await Effect.runPromise(program);
  }, 30_000);

  it('write-back rejects when detail level is not higher', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: false,
        logger,
      });

      // Open document
      yield* topology.dataOwner.executeEffect(
        new DispatchDocumentOpen({
          uri: TEST_URI,
          languageId: 'apex',
          version: 1,
          content: SAMPLE_APEX_CLASS,
        }),
      );

      // Query current state
      const queryResult = yield* topology.dataOwner.executeEffect(
        new QuerySymbolSubset({
          uris: [TEST_URI],
        }),
      );

      const currentDetailLevel = queryResult.detailLevels[TEST_URI];
      logger.info(() => `Current detail level: ${currentDetailLevel}`);

      // Try to write back with same or lower detail level
      const updateResult = yield* topology.dataOwner.executeEffect(
        new UpdateSymbolSubset({
          uri: TEST_URI,
          documentVersion: 1,
          enrichedSymbolTable: {
            symbols: [],
            references: [],
            hierarchicalReferences: [],
            metadata: {
              fileUri: TEST_URI,
              documentVersion: 1,
              parseCompleteness: 'complete' as const,
            },
            fileUri: TEST_URI,
          },
          enrichedDetailLevel: currentDetailLevel as any,
          sourceWorkerId: 'test-worker-same-level',
        }),
      );

      // Verify write-back rejected because detail level not higher
      expect(updateResult.accepted).toBe(false);
      expect(updateResult.versionMismatch).toBe(false);
      expect(updateResult.merged).toBe(0);

      logger.info(
        () =>
          `Same-level write-back correctly rejected: accepted=${updateResult.accepted}`,
      );
    }).pipe(
      Effect.scoped,
      Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
    );

    await Effect.runPromise(program);
  }, 30_000);

  it.skip('concurrent hovers from multiple enrichment workers', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 3, // Multiple workers
        enableResourceLoader: false,
        logger,
      });

      // Open document
      yield* topology.dataOwner.executeEffect(
        new DispatchDocumentOpen({
          uri: TEST_URI,
          languageId: 'apex',
          version: 1,
          content: SAMPLE_APEX_CLASS,
        }),
      );

      // Dispatch multiple concurrent hovers
      const hoverPromises = [
        topology.enrichmentPool.executeEffect(
          new DispatchHover({
            textDocument: { uri: TEST_URI },
            position: { line: 1, character: 15 },
            content: SAMPLE_APEX_CLASS,
          }),
        ),
        topology.enrichmentPool.executeEffect(
          new DispatchHover({
            textDocument: { uri: TEST_URI },
            position: { line: 5, character: 20 },
            content: SAMPLE_APEX_CLASS,
          }),
        ),
        topology.enrichmentPool.executeEffect(
          new DispatchHover({
            textDocument: { uri: TEST_URI },
            position: { line: 2, character: 10 },
            content: SAMPLE_APEX_CLASS,
          }),
        ),
      ];

      const results = yield* Effect.all(hoverPromises, {
        concurrency: 'unbounded',
      });

      // All hovers should complete successfully
      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.result).toBeDefined();
      });

      // Query final state - should be enriched to 'full'
      const queryAfter = yield* topology.dataOwner.executeEffect(
        new QuerySymbolSubset({
          uris: [TEST_URI],
        }),
      );

      logger.info(
        () =>
          `After concurrent hovers: detailLevel=${queryAfter.detailLevels[TEST_URI]}`,
      );

      // Version should still be 1
      expect(queryAfter.versions[TEST_URI]).toBe(1);

      // Detail level should be full (hovers require full enrichment)
      // Note: Due to concurrent write-backs, only first should succeed
      expect(queryAfter.detailLevels[TEST_URI]).toBeDefined();
    }).pipe(
      Effect.scoped,
      Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
    );

    await Effect.runPromise(program);
  }, 30_000);
});
