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
  DispatchDocumentOpen,
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

  // NOTE: the former it.skip enrichment-flow tests (full hover write-back flow,
  // references through the pool, implementation through the pool, and concurrent
  // hovers from multiple workers) are now covered with the assistance bus wired
  // in EnrichmentRoundTrip.node.test.ts — which is the live end-to-end coverage
  // their skip comments deferred to W-22692429. They were removed from here
  // rather than left skipped: this file's remaining tests cover the data-owner's
  // version/detail-level write-back VALIDATION directly (no bus needed).

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
  }, 120_000);

  it('write-back rejects when detail level is not higher', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: false,
        logger,
      });

      // Open document (storage-only, no compilation on data-owner)
      yield* topology.dataOwner.executeEffect(
        new DispatchDocumentOpen({
          uri: TEST_URI,
          languageId: 'apex',
          version: 1,
          content: SAMPLE_APEX_CLASS,
        }),
      );

      const enrichedSymbols = {
        symbols: [],
        references: [],
        hierarchicalReferences: [],
        metadata: {
          fileUri: TEST_URI,
          documentVersion: 1,
          parseCompleteness: 'complete' as const,
        },
        fileUri: TEST_URI,
      };

      // First write-back at public-api should succeed (no prior level)
      const firstResult = yield* topology.dataOwner.executeEffect(
        new UpdateSymbolSubset({
          uri: TEST_URI,
          documentVersion: 1,
          enrichedSymbolTable: enrichedSymbols,
          enrichedDetailLevel: 'public-api' as const,
          sourceWorkerId: 'test-worker-first',
        }),
      );
      expect(firstResult.accepted).toBe(true);

      // Second write-back at same level should be rejected
      const updateResult = yield* topology.dataOwner.executeEffect(
        new UpdateSymbolSubset({
          uri: TEST_URI,
          documentVersion: 1,
          enrichedSymbolTable: enrichedSymbols,
          enrichedDetailLevel: 'public-api' as const,
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
  }, 120_000);
});
