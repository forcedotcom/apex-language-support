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
  QuerySymbolSubset,
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

  it.skip('data owner accepts write-back when version matches and detail level increases', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: false,
        logger,
      });

      // Step 1: Open document (version 1)
      yield* topology.dataOwner.executeEffect(
        new DispatchDocumentOpen({
          uri: TEST_URI,
          languageId: 'apex',
          version: 1,
          content: SAMPLE_APEX_CLASS,
        }),
      );

      // Step 2: Query initial state
      const initialQuery = yield* topology.dataOwner.executeEffect(
        new QuerySymbolSubset({
          uris: [TEST_URI],
        }),
      );

      expect(initialQuery.versions[TEST_URI]).toBe(1);
      const initialDetailLevel = initialQuery.detailLevels[TEST_URI];
      logger.info(() => `Initial detail level: ${initialDetailLevel}`);

      // Step 3: Manually create enriched symbols (simulate enrichment)
      const enrichedSymbols = {
        symbols: [
          {
            id: 'test-symbol-1',
            name: 'testMethod',
            kind: 'Method',
            location: {
              uri: TEST_URI,
              range: {
                start: { line: 1, character: 18 },
                end: { line: 1, character: 28 },
              },
            },
          },
        ],
        references: [],
        hierarchicalReferences: [],
        metadata: {
          fileUri: TEST_URI,
          documentVersion: 1,
          parseCompleteness: 'complete' as const,
        },
        fileUri: TEST_URI,
      };

      // Step 4: Write back with higher detail level
      const updateResult = yield* topology.dataOwner.executeEffect(
        new UpdateSymbolSubset({
          uri: TEST_URI,
          documentVersion: 1,
          enrichedSymbolTable: enrichedSymbols,
          enrichedDetailLevel: 'full' as const,
          sourceWorkerId: 'test-worker-simple',
        }),
      );

      // Verify write-back accepted
      logger.info(
        () =>
          `Write-back result: accepted=${updateResult.accepted}, merged=${updateResult.merged}`,
      );
      expect(updateResult.accepted).toBe(true);
      expect(updateResult.versionMismatch).toBe(false);
      expect(updateResult.merged).toBeGreaterThan(0);

      // Step 5: Query again to verify detail level increased
      const finalQuery = yield* topology.dataOwner.executeEffect(
        new QuerySymbolSubset({
          uris: [TEST_URI],
        }),
      );

      const finalDetailLevel = finalQuery.detailLevels[TEST_URI];
      logger.info(() => `Final detail level: ${finalDetailLevel}`);
      expect(finalDetailLevel).toBe('full');
    }).pipe(
      Effect.scoped,
      Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
    );

    await Effect.runPromise(program);
  }, 30_000);

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
  }, 30_000);

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
  }, 30_000);

  it.skip('multiple workers can write back concurrently (first wins)', async () => {
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

      const enrichedSymbols = {
        symbols: [{ id: '1', name: 'test', kind: 'Method', location: {} }],
        references: [],
        hierarchicalReferences: [],
        metadata: {
          fileUri: TEST_URI,
          documentVersion: 1,
          parseCompleteness: 'complete' as const,
        },
        fileUri: TEST_URI,
      };

      // Simulate two workers trying to write back concurrently
      const [result1, result2] = yield* Effect.all(
        [
          topology.dataOwner.executeEffect(
            new UpdateSymbolSubset({
              uri: TEST_URI,
              documentVersion: 1,
              enrichedSymbolTable: enrichedSymbols,
              enrichedDetailLevel: 'full' as const,
              sourceWorkerId: 'worker-1',
            }),
          ),
          topology.dataOwner.executeEffect(
            new UpdateSymbolSubset({
              uri: TEST_URI,
              documentVersion: 1,
              enrichedSymbolTable: enrichedSymbols,
              enrichedDetailLevel: 'full' as const,
              sourceWorkerId: 'worker-2',
            }),
          ),
        ],
        { concurrency: 'unbounded' },
      );

      logger.info(
        () =>
          `Concurrent write-back: worker-1 accepted=${result1.accepted}, worker-2 accepted=${result2.accepted}`,
      );

      // One should succeed, one should fail (already at full detail level)
      const acceptedCount = [result1, result2].filter((r) => r.accepted).length;
      expect(acceptedCount).toBe(1); // Exactly one accepted
    }).pipe(
      Effect.scoped,
      Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
    );

    await Effect.runPromise(program);
  }, 30_000);
});
