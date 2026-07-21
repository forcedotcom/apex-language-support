/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/*
 * Browser integration harness. This worker creates the compiler workers, so
 * the test exercises the nested Web Worker topology used by the data owner.
 */

import * as Worker from '@effect/platform/Worker';
import * as BrowserWorker from '@effect/platform-browser/BrowserWorker';
import { Effect } from 'effect';
import {
  CompileApexFile,
  InitializeCompilationWorker,
  type CompilationWorkerRequest,
} from '@salesforce/apex-lsp-shared';

self.addEventListener(
  'message',
  (event: MessageEvent<{ compilerSource: string }>) => {
    const compilerUrl = URL.createObjectURL(
      new Blob([event.data.compilerSource], {
        type: 'application/javascript',
      }),
    );

    const program = Effect.gen(function* () {
      const pool = yield* Worker.makePoolSerialized<CompilationWorkerRequest>({
        size: 2,
        concurrency: 1,
        initialMessage: () => new InitializeCompilationWorker({}),
      });
      return yield* Effect.all(
        [
          new CompileApexFile({
            uri: 'file:///browser/BrowserOne.cls',
            content: 'public class BrowserOne { public void first() {} }',
            languageId: 'apex',
            version: 1,
            detailLevel: 'public-api',
            collectReferences: true,
          }),
          new CompileApexFile({
            uri: 'file:///browser/BrowserTwo.cls',
            content: 'public class BrowserTwo { public void second() {} }',
            languageId: 'apex',
            version: 1,
            detailLevel: 'public-api',
            collectReferences: true,
          }),
        ].map((request) => pool.executeEffect(request)),
        { concurrency: 2 },
      );
    }).pipe(
      Effect.scoped,
      Effect.provide(
        BrowserWorker.layer(() => new globalThis.Worker(compilerUrl)),
      ),
    );

    Effect.runPromise(program).then(
      (results) => {
        URL.revokeObjectURL(compilerUrl);
        self.postMessage({
          ok: true,
          results: results.map((result) => ({
            uri: result.uri,
            version: result.version,
            symbolCount: result.metrics.symbolCount,
          })),
        });
      },
      (error) => {
        URL.revokeObjectURL(compilerUrl);
        self.postMessage({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      },
    );
  },
);
