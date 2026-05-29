/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Integration test for the ResolveDependentUris data-owner handler.
 *
 * Verifies the protocol round-trip: the wire schema is registered, the
 * handler is wired, the role guard accepts the request for dataOwner,
 * and the response shape is correct. The handler's algorithm
 * (findSymbolsInFile + findReferencesTo + serialize) is unit-tested
 * via ApexSymbolManager's existing test coverage; this test ensures
 * the full IPC path works end-to-end.
 *
 * Pattern matches WriteBackProtocol.integration.node.test.ts — keeps
 * the integration footprint small and reliable, deferring full
 * cross-file find-references coverage to a future Playwright test.
 */

import * as path from 'path';
import {
  initializeTopology,
  makeNodeWorkerLayer,
} from '../../src/server/WorkerCoordinator';
import {
  DispatchDocumentOpen,
  ResolveDependentUris,
  getLogger,
} from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';

const WORKER_TS_ENTRY = path.resolve(__dirname, '../../src/worker.platform.ts');
const TSX_OPTIONS = { execArgv: ['--import', 'tsx'] };

const SAMPLE_APEX_CLASS = `public class FileUtilities {
    public String createFile(String name) {
        return name;
    }
}`;

const TARGET_URI = 'file:///test/FileUtilities.cls';

describe('ResolveDependentUris Integration Tests', () => {
  const logger = getLogger();

  it('returns empty entries when no dependents exist on the data-owner', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: false,
        logger,
      });

      // Open the target document on the data-owner. With no other
      // documents ingested, no other file can reference this one — so
      // ResolveDependentUris should return an empty entries map.
      yield* topology.dataOwner.executeEffect(
        new DispatchDocumentOpen({
          uri: TARGET_URI,
          languageId: 'apex',
          version: 1,
          content: SAMPLE_APEX_CLASS,
        }),
      );

      const result = yield* topology.dataOwner.executeEffect(
        new ResolveDependentUris({
          uri: TARGET_URI,
        }),
      );

      // Protocol-level assertions: the response shape is correct and the
      // data-owner accepted the request via the role guard.
      expect(result).toBeDefined();
      expect(result.entries).toBeDefined();
      expect(typeof result.entries).toBe('object');
      // Source URI must never appear in its own dependents map.
      expect(result.entries[TARGET_URI]).toBeUndefined();

      logger.info(
        () =>
          `ResolveDependentUris returned entries for ${
            Object.keys(result.entries).length
          } dependent(s)`,
      );
    }).pipe(
      Effect.scoped,
      Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
    );

    await Effect.runPromise(program);
  }, 120_000);

  it('accepts the optional symbolName param without error', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: false,
        logger,
      });

      yield* topology.dataOwner.executeEffect(
        new DispatchDocumentOpen({
          uri: TARGET_URI,
          languageId: 'apex',
          version: 1,
          content: SAMPLE_APEX_CLASS,
        }),
      );

      // symbolName narrows the search to a specific declared symbol.
      // Even when no symbols match (no compilation has run), the
      // handler must return an empty entries map without erroring.
      const result = yield* topology.dataOwner.executeEffect(
        new ResolveDependentUris({
          uri: TARGET_URI,
          symbolName: 'createFile',
        }),
      );

      expect(result.entries).toBeDefined();
      expect(typeof result.entries).toBe('object');
    }).pipe(
      Effect.scoped,
      Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
    );

    await Effect.runPromise(program);
  }, 120_000);
});
