/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'node:path';
import { Worker as NodeWorkerThread } from 'node:worker_threads';
import * as Worker from '@effect/platform/Worker';
import * as NodeWorker from '@effect/platform-node/NodeWorker';
import { Effect } from 'effect';
import {
  CompileApexFile,
  InitializeCompilationWorker,
  type CompilationWorkerRequest,
} from '@salesforce/apex-lsp-shared';
import { reconstructCompiledSymbolTable } from '../../src/compiler/CompilationWorkerHandler';

const WORKER_ENTRY = path.resolve(
  __dirname,
  '../../src/compiler.worker.node.ts',
);

describe('dedicated Effect compilation worker', () => {
  it('compiles and reconstructs a file across a real Node worker boundary', async () => {
    const program = Effect.scoped(
      Effect.gen(function* () {
        const pool = yield* Worker.makePoolSerialized<CompilationWorkerRequest>(
          {
            size: 1,
            concurrency: 1,
            initialMessage: () =>
              new InitializeCompilationWorker({ logLevel: 'error' }),
          },
        );

        return yield* pool.executeEffect(
          new CompileApexFile({
            uri: 'file:///workspace/EffectWorkerFixture.cls',
            content:
              'public class EffectWorkerFixture { public void execute() {} }',
            languageId: 'apex',
            version: 9,
            detailLevel: 'public-api',
            collectReferences: true,
          }),
        );
      }),
    ).pipe(
      Effect.provide(
        NodeWorker.layer(
          () =>
            new NodeWorkerThread(WORKER_ENTRY, {
              execArgv: ['--import', 'tsx'],
            }),
        ),
      ),
    );

    const result = await Effect.runPromise(program);
    const table = reconstructCompiledSymbolTable(result);

    expect(result.version).toBe(9);
    expect(result.metrics.symbolCount).toBeGreaterThan(0);
    expect(table.getAllSymbols().map((symbol) => symbol.name)).toContain(
      'EffectWorkerFixture',
    );
  }, 30_000);
});
