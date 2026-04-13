/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Step 9 — Proxy that forwards ResourceLoader calls to the
 * resource-loader worker via wire messages. Same public API as
 * ResourceLoader but backed by IPC.
 *
 * The coordinator creates this after spawning the topology with
 * `enableResourceLoader: true`. When the proxy is set, consumers
 * can query stdlib data without blocking the coordinator thread.
 */

import { Effect } from 'effect';
import type * as Worker from '@effect/platform/Worker';
import {
  ResourceLoaderGetSymbolTable,
  ResourceLoaderGetFile,
  ResourceLoaderResolveClass,
} from '@salesforce/apex-lsp-shared';
import type {
  ResourceLoaderRequest,
  LoggerInterface,
} from '@salesforce/apex-lsp-shared';

export class ResourceLoaderProxy {
  constructor(
    private readonly worker: Worker.SerializedWorker<ResourceLoaderRequest>,
    private readonly logger: LoggerInterface,
  ) {}

  async getSymbolTable(classPath: string): Promise<unknown | null> {
    const msg = new ResourceLoaderGetSymbolTable({ classPath });
    const result = await Effect.runPromise(this.worker.executeEffect(msg));
    return result.found ? (result.symbolTable ?? null) : null;
  }

  async getFile(path: string): Promise<string | undefined> {
    const msg = new ResourceLoaderGetFile({ path });
    const result = await Effect.runPromise(this.worker.executeEffect(msg));
    return result.found ? result.content : undefined;
  }

  resolveStandardClassFqn(className: string): Promise<string | null> {
    const msg = new ResourceLoaderResolveClass({ className });
    return Effect.runPromise(this.worker.executeEffect(msg)).then((r) =>
      r.found ? (r.fqn ?? null) : null,
    );
  }
}
