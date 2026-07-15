/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { trace, SpanStatusCode, context } from '@opentelemetry/api';
import type { Tracer } from '@opentelemetry/api';

const TRACER_NAME = 'apex-language-server';

let tracingEnabled = false;
let tracer: Tracer | undefined;

/**
 * Enable tracing. A tracer is obtained from the global TracerProvider on first
 * use — callers must register a TracerProvider before spans will be recorded.
 */
export const enableTracing = (): void => {
  tracingEnabled = true;
};

/**
 * Disable tracing. No new spans will be created after this call.
 */
export const disableTracing = (): void => {
  tracingEnabled = false;
  tracer = undefined;
};

/**
 * Check if tracing is currently enabled
 */
export const isTracingEnabled = (): boolean => tracingEnabled;

function getTracer(): Tracer {
  if (!tracer) {
    tracer = trace.getTracer(TRACER_NAME);
  }
  return tracer;
}

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
 * Run a Promise-returning function inside an OTEL span.
 * If tracing is disabled, the function is executed directly with no overhead.
 */
export const runWithSpan = async <T>(
  spanName: string,
  fn: () => Promise<T>,
  attributes?: LspSpanAttributes,
): Promise<T> => {
  if (!tracingEnabled) {
    return fn();
  }

  return getTracer().startActiveSpan(spanName, async (span) => {
    if (attributes) {
      for (const [key, value] of Object.entries(attributes)) {
        if (value != null) {
          span.setAttribute(key, value);
        }
      }
    }
    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (e) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: e instanceof Error ? e.message : String(e),
      });
      throw e;
    } finally {
      span.end();
    }
  });
};

/**
 * Capture the current OTEL context and run an async function within it.
 * This preserves trace context across async boundaries that would otherwise lose it.
 *
 * Use this when you need to run async work (like an IIFE) but want to maintain
 * the parent span context for any child spans created inside.
 */
export const runWithCapturedContext = async <T>(
  fn: () => Promise<T>,
): Promise<T> => {
  const capturedContext = context.active();
  return context.with(capturedContext, fn);
};

/**
 * Capture the current OTEL context for work that will execute later.
 *
 * Unlike runWithCapturedContext(), which invokes its callback immediately,
 * this returns a runner that can be stored with queued work and invoked when
 * that work is eventually scheduled on another async/fiber context.
 */
export const captureActiveTraceContext = (): (<T>(fn: () => T) => T) => {
  const capturedContext = context.active();
  return <T>(fn: () => T): T => context.with(capturedContext, fn);
};

/**
 * Run a synchronous function inside an OTEL span.
 * If tracing is disabled, the function is executed directly with no overhead.
 */
export const runSyncWithSpan = <T>(
  spanName: string,
  fn: () => T,
  attributes?: LspSpanAttributes,
): T => {
  if (!tracingEnabled) {
    return fn();
  }

  return getTracer().startActiveSpan(spanName, (span) => {
    if (attributes) {
      for (const [key, value] of Object.entries(attributes)) {
        if (value != null) {
          span.setAttribute(key, value);
        }
      }
    }
    try {
      const result = fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (e) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: e instanceof Error ? e.message : String(e),
      });
      throw e;
    } finally {
      span.end();
    }
  });
};

/**
 * Create a traced wrapper for an async function.
 * Returns a function with the same signature that adds tracing.
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

  // Workspace load pipeline (coordinator — uses runWithSpan)
  WORKSPACE_LOAD_TOTAL: 'workspace.load.total',
  WORKSPACE_BATCH_DECODE: 'workspace.batch.decode',
  WORKSPACE_BATCH_INGEST_CHUNK: 'workspace.batch.ingestChunk',
  WORKSPACE_BATCH_COMPILE_CHUNK: 'workspace.batch.compileChunk',
  WORKSPACE_CROSS_FILE_ENRICHMENT: 'workspace.crossFileEnrichment',
  COLD_READ_GATE_WAIT: 'coldReadGate.wait',

  // Worker spans (via Effect.fn — names must match exactly)
  WORKER_DATA_OWNER_READ: 'worker.dataOwner.read',
  WORKER_DATA_OWNER_WRITE: 'worker.dataOwner.write',
  WORKER_DATA_OWNER_BATCH_INGEST: 'worker.dataOwner.batchIngest',
  WORKER_DATA_OWNER_QUERY_SYMBOL_SUBSET: 'worker.dataOwner.querySymbolSubset',
  WORKER_DATA_OWNER_UPDATE_SYMBOL_SUBSET: 'worker.dataOwner.updateSymbolSubset',
  WORKER_DATA_OWNER_DRAIN_DEFERRED: 'worker.dataOwner.drainDeferredReferences',
  WORKER_DATA_OWNER_RESOLVE_DEP_URIS: 'worker.dataOwner.resolveDepUris',
  WORKER_DATA_OWNER_RESOLVE_DEPENDENT_URIS:
    'worker.dataOwner.resolveDependentUris',
  WORKER_DATA_OWNER_QUERY_SYMBOL_BY_NAME: 'worker.dataOwner.querySymbolByName',
  WORKER_DATA_OWNER_PEEK_READINESS: 'worker.dataOwner.peekReadiness',
  WORKER_DATA_OWNER_DOCUMENT_OPEN: 'worker.dataOwner.document.open',
  WORKER_DATA_OWNER_DOCUMENT_CHANGE: 'worker.dataOwner.document.change',
  WORKER_DATA_OWNER_DOCUMENT_SAVE: 'worker.dataOwner.document.save',
  WORKER_DATA_OWNER_DOCUMENT_CLOSE: 'worker.dataOwner.document.close',
  WORKER_COMPILATION_COMPILE_DOCUMENT: 'worker.compilation.compileDocument',
  WORKER_COMPILATION_BATCH_COMPILE: 'worker.compilation.batchCompile',
  WORKER_COMPILATION_BATCH_COMPILE_FILE: 'worker.compilation.batchCompile.file',
  WORKER_LSP_REQUEST: 'worker.lspRequest', // suffix is the tag (hover, definition, etc.)
} as const;
