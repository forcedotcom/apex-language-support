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
 * init still succeeds and that a worker response is not coupled to an OTLP
 * export completing.
 */

import * as path from 'path';
import * as http from 'http';
import {
  initializeTopology,
  makeNodeWorkerLayer,
} from '../../src/server/WorkerCoordinator';
import { PingWorker, getLogger } from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';

const WORKER_ENTRY = path.resolve(__dirname, '../../dist/worker.platform.js');

describe('Worker topology init with tracing enabled', () => {
  it('returns PingWorker before its OTLP export response completes', async () => {
    let releaseTargetExport: (() => void) | undefined;
    let targetExportFinished = false;
    let targetExportReceivedResolve: (() => void) | undefined;
    const targetExportReceived = new Promise<void>((resolve) => {
      targetExportReceivedResolve = resolve;
    });
    let targetExportFinishedResolve: (() => void) | undefined;
    const targetExportFinishedPromise = new Promise<void>((resolve) => {
      targetExportFinishedResolve = resolve;
    });
    let pingReceivedResolve:
      ((ping: { readonly echo: string }) => void) | undefined;
    const pingReceived = new Promise<{ readonly echo: string }>((resolve) => {
      pingReceivedResolve = resolve;
    });
    let topologyFailedReject: ((error: unknown) => void) | undefined;
    const topologyFailed = new Promise<never>((_, reject) => {
      topologyFailedReject = reject;
    });
    const server = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        const exported = JSON.parse(
          Buffer.concat(chunks).toString('utf-8'),
        ) as {
          resourceSpans?: Array<{
            scopeSpans?: Array<{ spans?: Array<{ name: string }> }>;
          }>;
        };
        const containsPingSpan = exported.resourceSpans?.some((resource) =>
          resource.scopeSpans?.some((scope) =>
            scope.spans?.some(
              (span) => span.name === 'worker.dataOwner.PingWorker',
            ),
          ),
        );
        if (!containsPingSpan) {
          res.writeHead(200);
          res.end();
          return;
        }

        targetExportReceivedResolve?.();
        releaseTargetExport = () => {
          if (res.writableEnded || res.headersSent) {
            return;
          }
          res.writeHead(200);
          res.end();
        };
        res.once('finish', () => {
          targetExportFinished = true;
          targetExportFinishedResolve?.();
        });
      });
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const { port } = server.address() as { port: number };
    const spanCollectorUrl = `http://127.0.0.1:${port}`;

    let releaseTopology: (() => void) | undefined;
    const topologyReleased = new Promise<void>((resolve) => {
      releaseTopology = resolve;
    });
    let pingPromise: Promise<{ readonly echo: string }> | undefined;
    try {
      const logger = getLogger();

      const program = Effect.gen(function* () {
        const topology = yield* initializeTopology({
          poolSize: 1,
          enableResourceLoader: false,
          logger,
          spanCollectorUrl,
        });

        const ping = yield* topology.dataOwner.executeEffect(
          new PingWorker({ echo: 'tracing-sanity' }),
        );
        yield* Effect.sync(() => pingReceivedResolve?.(ping));
        yield* Effect.promise(() => topologyReleased);
        return ping;
      }).pipe(Effect.scoped, Effect.provide(makeNodeWorkerLayer(WORKER_ENTRY)));

      pingPromise = Effect.runPromise(program);
      void pingPromise.catch((error) => topologyFailedReject?.(error));
      await Promise.race([
        targetExportReceived,
        topologyFailed,
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('PingWorker span was not exported')),
            10_000,
          ),
        ),
      ]);
      const ping = await Promise.race([
        pingReceived,
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(new Error('PingWorker waited for OTLP export completion')),
            1_000,
          ),
        ),
      ]);
      expect(ping.echo).toBe('tracing-sanity');
      expect(targetExportFinished).toBe(false);

      releaseTargetExport?.();
      await targetExportFinishedPromise;
      releaseTopology?.();
      await pingPromise;
    } finally {
      releaseTargetExport?.();
      releaseTopology?.();
      await pingPromise?.catch(() => undefined);
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }, 45_000);
});
