/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Simplified write-back protocol test - bypasses enrichment complexity.
 * Tests just the protocol validation logic.
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

const SAMPLE_APEX_CLASS = `public class TestClass {
    public String testMethod() {
        return 'Hello World';
    }
}`;

const TEST_URI = 'file:///test/TestClass.cls';

describe('WriteBackProtocol Simple Tests', () => {
  const logger = getLogger();

  // NOTE: the write-back ACCEPT path (version matches + detail level increases)
  // and the concurrent-write-back "first wins" scenario are covered by the
  // bus-wired live-worker tests: EnrichmentRoundTrip.node.test.ts (real
  // enrichment merges) and WorkerConcurrencyInterop.node.test.ts (the
  // detail-level race + concurrent-hovers tests). They cannot run here as
  // isolated dataOwner.executeEffect calls: the accept path's addSymbolTable
  // resolution forwards stdlib lookups over the assistance bus
  // (makeResourceLoaderRemoteLayer), which hangs with no mediator/resource
  // loader wired. The two tests below cover the REJECT branches, which return
  // before any resolution and so need no bus.

  it('data owner rejects write-back when version mismatches', async () => {
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

      // "Simulate" document change to version 2
      const changedContent = SAMPLE_APEX_CLASS + '\n// Comment\n';
      yield* topology.dataOwner.executeEffect(
        new DispatchDocumentOpen({
          uri: TEST_URI,
          languageId: 'apex',
          version: 2,
          content: changedContent,
        }),
      );

      // Try to write back for stale version 1
      const updateResult = yield* topology.dataOwner.executeEffect(
        new UpdateSymbolSubset({
          uri: TEST_URI,
          documentVersion: 1, // Stale!
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

      // Verify rejection due to version mismatch
      logger.info(
        () =>
          `Stale write-back result: accepted=${updateResult.accepted}, versionMismatch=${updateResult.versionMismatch}`,
      );
      expect(updateResult.accepted).toBe(false);
      expect(updateResult.versionMismatch).toBe(true);
      expect(updateResult.merged).toBe(0);
    }).pipe(
      Effect.scoped,
      Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
    );

    await Effect.runPromise(program);
  }, 120_000);

  it('data owner rejects write-back when detail level not higher', async () => {
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
          sourceWorkerId: 'test-worker-same',
        }),
      );

      // Verify rejection because detail level not higher
      logger.info(
        () =>
          'Same-level write-back result: ' +
          `accepted=${updateResult.accepted}, ` +
          `versionMismatch=${updateResult.versionMismatch}`,
      );
      expect(updateResult.accepted).toBe(false);
      expect(updateResult.versionMismatch).toBe(false);
      expect(updateResult.merged).toBe(0);
    }).pipe(
      Effect.scoped,
      Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
    );

    await Effect.runPromise(program);
  }, 120_000);
});
