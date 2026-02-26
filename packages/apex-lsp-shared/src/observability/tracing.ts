/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as Effect from 'effect/Effect';
import type { Layer } from 'effect/Layer';
import { ManagedRuntime } from 'effect';

/**
 * Global tracing state -- a persistent ManagedRuntime that keeps the OTEL SDK
 * alive for the entire server lifetime, avoiding per-call SDK create/teardown.
 */
let tracingRuntime: ManagedRuntime.ManagedRuntime<never, never> | undefined;
let tracingEnabled = false;

/**
 * Initialize the tracing runtime with a pre-built SDK layer.
 * The layer is built exactly once; the resulting runtime is reused for every
 * `runWithSpan` / `runSyncWithSpan` call until `shutdownTracing` is called.
 *
 * @param layer - A pre-built Effect Layer for tracing (e.g. NodeSdk.layer)
 */
export const initializeTracing = (layer: Layer<never, never, never>): void => {
  tracingRuntime = ManagedRuntime.make(layer);
  tracingEnabled = true;
};

/**
 * Check if tracing is currently enabled
 */
export const isTracingEnabled = (): boolean => tracingEnabled;

/**
 * Immediately disable tracing without waiting for pending spans to flush.
 * The runtime is disposed in the background; any in-flight spans may be lost.
 * For a clean shutdown that flushes pending spans, prefer `shutdownTracing`.
 */
export const disableTracing = (): void => {
  const rt = tracingRuntime;
  tracingEnabled = false;
  tracingRuntime = undefined;
  if (rt) {
    Effect.runPromise(rt.disposeEffect).catch(() => {
      // Best-effort disposal; errors are expected during abrupt shutdown
    });
  }
};

/**
 * Gracefully shut down the tracing runtime, flushing all pending spans to
 * their exporters before disposing resources.
 */
export const shutdownTracing = async (): Promise<void> => {
  if (!tracingRuntime) {
    return;
  }
  const rt = tracingRuntime;
  tracingEnabled = false;
  tracingRuntime = undefined;
  await Effect.runPromise(rt.disposeEffect);
};

/**
 * Common span attributes for LSP operations
 */
export interface LspSpanAttributes {
  /** The LSP method being called (e.g., 'textDocument/hover') */
  'lsp.method'?: string;
  /** The document URI being operated on */
  'document.uri'?: string;
  /** Position in the document (line:character) */
  'document.position'?: string;
  /** Any additional custom attributes */
  [key: string]: string | number | boolean | undefined;
}

/**
 * Run a Promise-returning function with optional tracing.
 * If tracing is disabled, the function is executed directly.
 *
 * @param spanName - Name of the span (e.g., 'lsp.hover')
 * @param fn - The async function to execute
 * @param attributes - Optional span attributes
 * @returns Promise with the result
 */
export const runWithSpan = async <T>(
  spanName: string,
  fn: () => Promise<T>,
  attributes?: LspSpanAttributes,
): Promise<T> => {
  if (!tracingEnabled || !tracingRuntime) {
    return fn();
  }

  const effect = Effect.tryPromise({
    try: fn,
    catch: (error) => error,
  }).pipe(
    Effect.withSpan(spanName, {
      attributes: attributes as Record<string, unknown>,
    }),
    Effect.catchAll((error) => {
      throw error;
    }),
  );

  return await tracingRuntime.runPromise(
    effect as Effect.Effect<T, never, never>,
  );
};

/**
 * Run a synchronous function with optional tracing.
 * If tracing is disabled, the function is executed directly.
 *
 * @param spanName - Name of the span (e.g., 'apex.parse')
 * @param fn - The sync function to execute
 * @param attributes - Optional span attributes
 * @returns The result
 */
export const runSyncWithSpan = <T>(
  spanName: string,
  fn: () => T,
  attributes?: LspSpanAttributes,
): T => {
  if (!tracingEnabled || !tracingRuntime) {
    return fn();
  }

  const effect = Effect.sync(fn).pipe(
    Effect.withSpan(spanName, {
      attributes: attributes as Record<string, unknown>,
    }),
  );

  return tracingRuntime.runSync(effect as Effect.Effect<T, never, never>);
};

/**
 * Create a traced wrapper for an async function.
 * Returns a function with the same signature that adds tracing.
 *
 * @param spanName - Name of the span
 * @param fn - The async function to wrap
 * @param getAttributes - Optional function to extract attributes from arguments
 * @returns Wrapped function with tracing
 */
export const withTracing =
  <TArgs extends unknown[], TResult>(
    spanName: string,
    fn: (...args: TArgs) => Promise<TResult>,
    getAttributes?: (...args: TArgs) => LspSpanAttributes,
  ): ((...args: TArgs) => Promise<TResult>) =>
  async (...args: TArgs): Promise<TResult> => {
    const attributes = getAttributes?.(...args);
    return runWithSpan(spanName, () => fn(...args), attributes);
  };

/**
 * Standard LSP span names following OpenTelemetry semantic conventions
 */
export const LSP_SPAN_NAMES = {
  // Document lifecycle
  DOCUMENT_OPEN: 'extension.document.open',
  DOCUMENT_CHANGE: 'extension.document.change',
  DOCUMENT_SAVE: 'extension.document.save',
  DOCUMENT_CLOSE: 'extension.document.close',

  // LSP protocol operations
  HOVER: 'extension.command.hover',
  COMPLETION: 'extension.command.completion',
  DEFINITION: 'extension.command.definition',
  IMPLEMENTATION: 'extension.command.implementation',
  REFERENCES: 'extension.command.references',
  DOCUMENT_SYMBOL: 'extension.command.documentSymbol',
  DIAGNOSTICS: 'extension.command.diagnostics',
  FOLDING_RANGE: 'extension.command.foldingRange',
  CODE_LENS: 'extension.command.codeLens',
  EXECUTE_COMMAND: 'extension.command.executeCommand',

  // Custom operations
  FIND_MISSING_ARTIFACT: 'extension.operation.findMissingArtifact',
  RESOLVE_APEXLIB: 'extension.operation.resolveApexlib',
  WORKSPACE_BATCH: 'extension.operation.workspaceBatch',
  PROCESS_BATCHES: 'extension.operation.processBatches',

  // Parser operations
  PARSE: 'extension.parser.parse',
  RESOLVE_SYMBOLS: 'extension.parser.resolveSymbols',

  // Queue operations
  QUEUE_PROCESS: 'extension.queue.process',
  QUEUE_WAIT: 'extension.queue.wait',
} as const;
