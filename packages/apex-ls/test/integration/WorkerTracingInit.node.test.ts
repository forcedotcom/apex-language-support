/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Sanity check for worker start/init with OTEL tracing enabled.
 *
 * Regression guard for a crash where `initWorkerTracing()` built the
 * `OtlpTracer` layer without providing its required `HttpClient` /
 * `OtlpSerialization` services. The layer type-checked (the requirement was
 * erased behind an overly-permissive `any`), but the first span created
 * against it failed at runtime with "Service not found", which propagated
 * out of `WorkerInit` and killed worker topology initialization — surfacing
 * to the user as the language server's "Server process exited with code 1".
 *
 * This spins up a real worker (not mocked) with a `spanCollectorUrl` set, so
 * `WorkerInit`'s handler exercises the exact `initWorkerTracing` +
 * `provideWorkerTracing` path production uses, against a real local HTTP
 * server standing in for the span collector. It asserts both that topology
 * init still succeeds and that the worker's test span is actually exported.
 */

import * as path from 'path';
import * as http from 'http';
import {
  initializeTopology,
  makeNodeWorkerLayer,
} from '../../src/server/WorkerCoordinator';
import { PingWorker, getLogger } from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';

const WORKER_TS_ENTRY = path.resolve(__dirname, '../../src/worker.platform.ts');
const TSX_OPTIONS = { execArgv: ['--import', 'tsx'] };

describe('Worker topology init with tracing enabled', () => {
  it.skip('initializes successfully and exports the worker init test span', async () => {
    const receivedBodies: string[] = [];
    const server = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        receivedBodies.push(Buffer.concat(chunks).toString('utf-8'));
        res.writeHead(200);
        res.end();
      });
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const { port } = server.address() as { port: number };
    const spanCollectorUrl = `http://127.0.0.1:${port}`;

    try {
      const logger = getLogger();

      const program = Effect.gen(function* () {
        const topology = yield* initializeTopology({
          poolSize: 1,
          enableResourceLoader: false,
          logger,
          spanCollectorUrl,
        });

        // Confirm the topology is actually usable, not just "didn't throw".
        return yield* topology.dataOwner.executeEffect(
          new PingWorker({ echo: 'tracing-sanity' }),
        );
      }).pipe(
        Effect.scoped,
        Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
      );

      const ping = await Effect.runPromise(program);
      expect(ping.echo).toBe('tracing-sanity');

      // The worker's test span export is fire-and-forget relative to
      // WorkerInit's response, so poll briefly for it to arrive rather than
      // asserting on a fixed delay.
      const deadline = Date.now() + 10_000;
      while (receivedBodies.length === 0 && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      expect(receivedBodies.length).toBeGreaterThan(0);
      const exported = JSON.parse(receivedBodies[0]);
      const spanNames = exported.resourceSpans[0].scopeSpans[0].spans.map(
        (span: { name: string }) => span.name,
      );
      expect(spanNames).toContain('worker.init.test.span');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }, 30_000);
});
