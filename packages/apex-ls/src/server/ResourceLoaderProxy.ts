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
  ResourceLoaderGetSymbolTables,
  ResourceLoaderGetFile,
  ResourceLoaderResolveClass,
  ResourceLoaderGetStandardNamespaces,
  runWithSpan,
} from '@salesforce/apex-lsp-shared';
import type {
  ResourceLoaderRequest,
  LoggerInterface,
} from '@salesforce/apex-lsp-shared';
import { injectTraceContextFromOtelSpan } from './traceContextInjection';

export class ResourceLoaderProxy {
  private readonly symbolTables = new Map<string, Promise<unknown | null>>();
  private readonly files = new Map<string, Promise<string | undefined>>();
  private readonly resolvedClasses = new Map<string, Promise<string | null>>();
  private standardNamespaces?: Promise<Record<string, string[]>>;

  constructor(
    private readonly worker:
      | Worker.SerializedWorker<ResourceLoaderRequest>
      | Worker.SerializedWorkerPool<ResourceLoaderRequest>,
    private readonly logger: LoggerInterface,
  ) {}

  private withTraceContext<T extends ResourceLoaderRequest>(message: T): T {
    const enriched = injectTraceContextFromOtelSpan(
      message as unknown as Record<string, unknown>,
    );
    if ('traceContext' in enriched) {
      (message as unknown as Record<string, unknown>).traceContext =
        enriched.traceContext;
    }
    return message;
  }

  async getSymbolTable(classPath: string): Promise<unknown | null> {
    const key = classPath.toLowerCase();
    const cacheHit = this.symbolTables.has(key);
    return runWithSpan(
      'resourceLoader.proxy.getSymbolTable',
      async () => {
        let pending = this.symbolTables.get(key);
        if (!pending) {
          pending = (async () => {
            const msg = this.withTraceContext(
              new ResourceLoaderGetSymbolTable({ classPath }),
            );
            const result = await Effect.runPromise(
              this.worker.executeEffect(msg),
            );
            return result.found ? (result.symbolTable ?? null) : null;
          })();
          this.symbolTables.set(key, pending);
          void pending.catch(() => {
            if (this.symbolTables.get(key) === pending) {
              this.symbolTables.delete(key);
            }
          });
        }
        return pending;
      },
      {
        'resource.class_path': classPath,
        'resource.cache_hit': cacheHit,
      },
    );
  }

  async getSymbolTables(
    classPaths: readonly string[],
  ): Promise<Record<string, unknown>> {
    return runWithSpan(
      'resourceLoader.proxy.getSymbolTables',
      async () => {
        const uniquePaths = [
          ...new Map(
            classPaths.map((classPath) => [classPath.toLowerCase(), classPath]),
          ).values(),
        ];
        const msg = this.withTraceContext(
          new ResourceLoaderGetSymbolTables({ classPaths: uniquePaths }),
        );
        const result = await Effect.runPromise(this.worker.executeEffect(msg));
        for (const [classPath, symbolTable] of Object.entries(result.entries)) {
          this.symbolTables.set(
            classPath.toLowerCase(),
            Promise.resolve(symbolTable),
          );
        }
        return result.entries;
      },
      {
        'resource.class_count': classPaths.length,
      },
    );
  }

  async getFile(path: string): Promise<string | undefined> {
    const key = path.toLowerCase();
    const cacheHit = this.files.has(key);
    return runWithSpan(
      'resourceLoader.proxy.getFile',
      async () => {
        let pending = this.files.get(key);
        if (!pending) {
          pending = (async () => {
            const msg = this.withTraceContext(
              new ResourceLoaderGetFile({ path }),
            );
            const result = await Effect.runPromise(
              this.worker.executeEffect(msg),
            );
            return result.found ? result.content : undefined;
          })();
          this.files.set(key, pending);
          void pending.catch(() => {
            if (this.files.get(key) === pending) {
              this.files.delete(key);
            }
          });
        }
        return pending;
      },
      {
        'resource.path': path,
        'resource.cache_hit': cacheHit,
      },
    );
  }

  resolveStandardClassFqn(className: string): Promise<string | null> {
    const key = className.toLowerCase();
    const cacheHit = this.resolvedClasses.has(key);
    return runWithSpan(
      'resourceLoader.proxy.resolveClass',
      async () => {
        let pending = this.resolvedClasses.get(key);
        if (!pending) {
          const msg = this.withTraceContext(
            new ResourceLoaderResolveClass({ className }),
          );
          pending = Effect.runPromise(this.worker.executeEffect(msg)).then(
            (r) => (r.found ? (r.fqn ?? null) : null),
          );
          this.resolvedClasses.set(key, pending);
          void pending.catch(() => {
            if (this.resolvedClasses.get(key) === pending) {
              this.resolvedClasses.delete(key);
            }
          });
        }
        return pending;
      },
      {
        'resource.class_name': className,
        'resource.cache_hit': cacheHit,
      },
    );
  }

  async getStandardNamespaces(): Promise<Record<string, string[]>> {
    const cacheHit = this.standardNamespaces !== undefined;
    return runWithSpan(
      'resourceLoader.proxy.getStandardNamespaces',
      async () => {
        if (this.standardNamespaces) {
          return this.standardNamespaces;
        }
        this.standardNamespaces = this.loadStandardNamespaces();
        void this.standardNamespaces.catch(() => {
          this.standardNamespaces = undefined;
        });
        return this.standardNamespaces;
      },
      { 'resource.cache_hit': cacheHit },
    );
  }

  private async loadStandardNamespaces(): Promise<Record<string, string[]>> {
    try {
      const msg = this.withTraceContext(
        new ResourceLoaderGetStandardNamespaces({}),
      );
      const result = await Effect.runPromise(this.worker.executeEffect(msg));
      return (
        (result as { namespaces?: Record<string, string[]> }).namespaces ?? {}
      );
    } catch (err) {
      this.logger.warn(
        () =>
          `[ResourceLoaderProxy] getStandardNamespaces failed: ${String(err)}`,
      );
      return {};
    }
  }
}
