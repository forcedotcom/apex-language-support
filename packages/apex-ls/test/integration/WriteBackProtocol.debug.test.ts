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
    console.log('=== Starting test ===');

    const program = Effect.gen(function* () {
      console.log('Step 1: Initializing topology...');
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: false,
        logger: getLogger(),
      });
      console.log('Step 1 DONE: Topology initialized');

      console.log('Step 2: Opening document...');
      const openResult = yield* topology.dataOwner.executeEffect(
        new DispatchDocumentOpen({
          uri: TEST_URI,
          languageId: 'apex',
          version: 1,
          content: SAMPLE_APEX_CLASS,
        }),
      );
      console.log('Step 2 DONE: Document opened, result:', openResult);

      console.log('Step 3: Creating update request...');
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
      console.log('Step 3 DONE: Update request created');

      console.log('Step 4: Sending UpdateSymbolSubset...');
      console.log('Request params:', {
        uri: TEST_URI,
        documentVersion: 1,
        enrichedDetailLevel: 'full',
        sourceWorkerId: 'test-debug',
      });

      const updateResult = yield* topology.dataOwner.executeEffect(
        new UpdateSymbolSubset({
          uri: TEST_URI,
          documentVersion: 1,
          enrichedSymbolTable: enrichedSymbols,
          enrichedDetailLevel: 'full' as const,
          sourceWorkerId: 'test-debug',
        }),
      );

      console.log('Step 4 DONE: UpdateSymbolSubset returned:', updateResult);

      expect(updateResult).toBeDefined();
      console.log('=== Test completed successfully ===');
      return updateResult;
    }).pipe(
      Effect.scoped,
      Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
    );

    const result = await Effect.runPromise(program);
    console.log('Final result:', result);
  }, 20_000);
});
