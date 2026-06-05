/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Debug test - minimal reproduction with verbose logging
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
  setLogLevel,
  enableConsoleLogging,
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

describe('WriteBackProtocol Debug Test', () => {
  beforeAll(() => {
    enableConsoleLogging();
    setLogLevel('debug');
  });

  it('minimal: just open document and write back', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: false,
        logger: getLogger(),
        logLevel: 'debug',
      });

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

      const updateResult = yield* topology.dataOwner.executeEffect(
        new UpdateSymbolSubset({
          uri: TEST_URI,
          documentVersion: 1,
          enrichedSymbolTable: enrichedSymbols,
          enrichedDetailLevel: 'full' as const,
          sourceWorkerId: 'test-debug',
        }),
      );

      expect(updateResult).toBeDefined();
      return updateResult;
    }).pipe(
      Effect.scoped,
      Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
    );

    await Effect.runPromise(program);
  }, 120_000);
});
