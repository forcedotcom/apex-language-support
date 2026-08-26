/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Platform-neutral worker logic shared by worker.platform.ts (Node) and
 * worker.platform.web.ts (Web/browser). Each entry file imports this module
 * with an explicit .ts extension — required because integration tests spawn
 * the entry files directly via tsx in a worker_threads subprocess, and tsx
 * cannot resolve bare relative specifiers in that context.
 *
 * Platform-specific values this module needs (coordinator assistance
 * transport, workerId, resource loader layer factory) are injected by each
 * shell via the setter functions below, called once at module load.
 */

import * as WorkerRunner from '@effect/platform/WorkerRunner';
import type { WorkspaceEdit } from 'vscode-languageserver';
import {
  Cause,
  Effect,
  LogLevel,
  Schema,
  Queue,
  Deferred,
  Option,
} from 'effect';
import type * as Tracer from 'effect/Tracer';
import {
  WorkerInit,
  PingWorker,
  WorkerRemoteStdlibWarmup,
  DataOwnerPreloadStandardNamespaces,
  QuerySymbolSubset,
  AwaitSymbolReadiness,
  UpdateSymbolSubset,
  InstallSObjectArtifacts,
  ResolveDepUris,
  ResolveDependentUris,
  WorkspaceBatchIngest,
  WorkspaceBatchCompileOnDataOwner,
  BeginWorkspaceLoadSession,
  DrainDeferredReferences,
  CompileDocument,
  CompileApexFile,
  InitializeCompilationWorker,
  ResourceLoaderGetSymbolTable,
  ResourceLoaderGetSymbolTables,
  ResourceLoaderGetFile,
  ResourceLoaderResolveClass,
  ResourceLoaderGetStandardNamespaces,
  DispatchDocumentOpen,
  DispatchDocumentChange,
  DispatchDocumentSave,
  DispatchDocumentClose,
  DispatchHover,
  DispatchDefinition,
  DispatchCompletion,
  DispatchSignatureHelp,
  DispatchCodeAction,
  DispatchReferences,
  DispatchRename,
  DispatchPrepareRename,
  DispatchImplementation,
  DispatchDocumentSymbol,
  DispatchCodeLens,
  DispatchDiagnostic,
  DispatchCrossFileEnrichment,
  DispatchGenericLspRequest,
  isAllowedTag,
  QueryGraphData,
  DataOwnerQuerySymbolByName,
  CheckMemberConflicts,
  FindOccurrenceCandidates,
  WIRE_PROTOCOL_VERSION,
  ApexCapabilitiesManager,
  ApexSettingsManager,
  type WorkerRole,
  type WorkerLogLevel,
} from '@salesforce/apex-lsp-shared';
import {
  getDocumentStateCache,
  getLspRequestPreparationPolicy,
  isSearchingHover,
  type DataOwnerServices,
  type LSPRequestType,
  type LspRequestPreparationPolicy,
  type RequestServices,
} from '@salesforce/apex-lsp-compliant-services';
import type {
  ApexSymbol,
  DetailLevel,
  SerializedSymbolTableData,
  SymbolReference,
} from '@salesforce/apex-lsp-parser-ast';
import {
  composeSObjectSymbolTable,
  ownerUriForSObject,
  STANDARD_APEX_LIBRARY_URI,
  SymbolKind,
  SymbolTable,
} from '@salesforce/apex-lsp-parser-ast';
import { getLogger } from '@salesforce/apex-lsp-shared';
import {
  CompilationWorkerPool,
  type CompilationWorkerPoolService,
} from './compiler/CompilationWorkerPool.ts';
import {
  createCompilationWorkerHandlers,
  reconstructCompiledSymbolTable,
} from './compiler/CompilationWorkerHandler.ts';
import { runWorkspaceCompilationPipeline } from './compiler/WorkspaceCompilationPipeline.ts';
import {
  clearSymbolStateForUri,
  recordSymbolStateEvent,
  selectSymbolStateReference,
  type SymbolStateReference,
  type SymbolStateSpanAttributes,
  type SymbolStateSymbol,
} from './server/SymbolStateFlightRecorder.ts';

// ---------------------------------------------------------------------------
// Schema union of all coordinator → worker requests
// WorkerAssistanceRequest excluded: it flows worker → coordinator
// ---------------------------------------------------------------------------

export const AllWorkerRequests = Schema.Union(
  WorkerInit,
  PingWorker,
  WorkerRemoteStdlibWarmup,
  DataOwnerPreloadStandardNamespaces,
  QuerySymbolSubset,
  AwaitSymbolReadiness,
  UpdateSymbolSubset,
  InstallSObjectArtifacts,
  ResolveDepUris,
  ResolveDependentUris,
  WorkspaceBatchIngest,
  WorkspaceBatchCompileOnDataOwner,
  BeginWorkspaceLoadSession,
  DrainDeferredReferences,
  QueryGraphData,
  DataOwnerQuerySymbolByName,
  CheckMemberConflicts,
  FindOccurrenceCandidates,
  CompileDocument,
  ResourceLoaderGetSymbolTable,
  ResourceLoaderGetSymbolTables,
  ResourceLoaderGetFile,
  ResourceLoaderResolveClass,
  ResourceLoaderGetStandardNamespaces,
  DispatchDocumentOpen,
  DispatchDocumentChange,
  DispatchDocumentSave,
  DispatchDocumentClose,
  DispatchHover,
  DispatchDefinition,
  DispatchCompletion,
  DispatchSignatureHelp,
  DispatchCodeAction,
  DispatchReferences,
  DispatchRename,
  DispatchPrepareRename,
  DispatchImplementation,
  DispatchDocumentSymbol,
  DispatchCodeLens,
  DispatchDiagnostic,
  DispatchCrossFileEnrichment,
  DispatchGenericLspRequest,
  InitializeCompilationWorker,
  CompileApexFile,
);

// ---------------------------------------------------------------------------
// Minimal document interface matching the subset of TextDocument used
// by storage/processing services. Avoids importing the full
// vscode-languageserver-textdocument package in worker context.
// ---------------------------------------------------------------------------

export interface WorkerDocument {
  readonly uri: string;
  readonly languageId: string;
  readonly version: number;
  getText(range?: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  }): string;
  // Position/offset helpers. Completion (analyzeCompletionContext,
  // GeneralCompletionStrategy.getWordAtPosition) calls document.offsetAt(); a
  // bare object without it throws "offsetAt is not a function" and the request
  // returns zero items. These are optional so existing minimal WorkerDocuments
  // (hover/documentSymbol only use getText()) keep compiling; makeWorkerDocument
  // supplies real implementations for the enrichment path.
  offsetAt?(position: { line: number; character: number }): number;
  positionAt?(offset: number): { line: number; character: number };
}

/**
 * Build a WorkerDocument backed by `content` with working offsetAt/positionAt
 * helpers. The worker deliberately avoids importing the full
 * vscode-languageserver-textdocument package (see WorkerDocument), so we compute
 * line/character⇄offset from the text directly. Newlines are counted as part of
 * the preceding line (matching TextDocument's line-start indexing), so an
 * offset/position round-trips for the line/character values the LSP hands us.
 */
export function makeWorkerDocument(
  uri: string,
  content: string,
  version = 0,
): WorkerDocument {
  // Offsets of the first character of each line. lineStarts[0] === 0.
  const lineStarts: number[] = [0];
  for (let i = 0; i < content.length; i++) {
    if (content.charCodeAt(i) === 10 /* \n */) {
      lineStarts.push(i + 1);
    }
  }
  const offsetAt = (position: { line: number; character: number }): number => {
    const line = Math.max(0, Math.min(position.line, lineStarts.length - 1));
    const lineStart = lineStarts[line];
    const lineEnd =
      line + 1 < lineStarts.length ? lineStarts[line + 1] : content.length;
    const maxChar = lineEnd - lineStart;
    return lineStart + Math.max(0, Math.min(position.character, maxChar));
  };
  return {
    uri,
    languageId: 'apex',
    version,
    getText: (range) =>
      range
        ? content.substring(offsetAt(range.start), offsetAt(range.end))
        : content,
    offsetAt,
    positionAt: (offset) => {
      const clamped = Math.max(0, Math.min(offset, content.length));
      // Binary search for the line whose start is the greatest ≤ clamped.
      let low = 0;
      let high = lineStarts.length - 1;
      while (low < high) {
        const mid = Math.floor((low + high + 1) / 2);
        if (lineStarts[mid] <= clamped) {
          low = mid;
        } else {
          high = mid - 1;
        }
      }
      return { line: low, character: clamped - lineStarts[low] };
    },
  };
}

// ---------------------------------------------------------------------------
// Utility — deep clone for structured-clone-safe postMessage results
// ---------------------------------------------------------------------------

export function cloneForWire<T>(value: T): T | null {
  return value != null ? JSON.parse(JSON.stringify(value)) : null;
}

// ---------------------------------------------------------------------------
// Role state & guard
// ---------------------------------------------------------------------------

export let assignedRole: WorkerRole | null = null;

export function setAssignedRole(role: WorkerRole): void {
  assignedRole = role;
}

/**
 * Defects on role violation — these are programming errors (coordinator
 * misrouted a message) and should never happen in normal operation.
 */
export const guardRole = (tag: string): Effect.Effect<void> => {
  if (assignedRole === null) {
    return Effect.die(
      new Error(
        `WorkerRoleViolation: no role assigned yet, cannot handle '${tag}'`,
      ),
    );
  }
  if (!isAllowedTag(assignedRole, tag)) {
    return Effect.die(
      new Error(
        `WorkerRoleViolation: tag '${tag}' not allowed for role '${assignedRole}'`,
      ),
    );
  }
  return Effect.void;
};

// ---------------------------------------------------------------------------
// Worker log level (pure, platform-neutral — the transport that reads
// currentWorkerLogLevel to decide whether to post a message stays in each
// platform shell, since workerLogger/WorkerLoggerLayer differ structurally)
// ---------------------------------------------------------------------------

export const LOG_LEVEL_PRIORITY: Record<WorkerLogLevel, number> = {
  debug: 0,
  info: 1,
  warning: 2,
  error: 3,
};

export let currentWorkerLogLevel: WorkerLogLevel = 'error';

export function setWorkerLogLevel(level: string): void {
  if (level in LOG_LEVEL_PRIORITY) {
    currentWorkerLogLevel = level as WorkerLogLevel;
  }
}

export function effectLogLevelToWire(
  level: LogLevel.LogLevel,
): WorkerLogLevel | null {
  if (LogLevel.greaterThanEqual(level, LogLevel.Error)) return 'error';
  if (LogLevel.greaterThanEqual(level, LogLevel.Warning)) return 'warning';
  if (LogLevel.greaterThanEqual(level, LogLevel.Info)) return 'info';
  if (LogLevel.greaterThanEqual(level, LogLevel.Debug)) return 'debug';
  return null;
}

// ---------------------------------------------------------------------------
// Platform-specific value injection (DI shims)
//
// Each shell (worker.platform.ts / worker.platform.web.ts) calls these
// setters once, synchronously, at module load. Safe regardless of call
// order relative to this module's own top-level Effect.cached(...) blocks
// (Task 2/3), because Effect.cached defers the wrapped generator's body
// until the first time something actually runs the cached Effect — which
// only happens inside a request handler, well after both modules finish
// loading.
// ---------------------------------------------------------------------------

type AssistanceTransport = (
  method: string,
  params: unknown,
  blocking: boolean,
) => Promise<unknown>;

let _requestCoordinatorAssistancePromise: AssistanceTransport = () =>
  Promise.reject(new Error('assistance transport not initialized'));

export function setAssistanceTransport(fn: AssistanceTransport): void {
  _requestCoordinatorAssistancePromise = fn;
}

export function requestCoordinatorAssistancePromiseShared(
  method: string,
  params: unknown,
  blocking: boolean,
): Promise<unknown> {
  return _requestCoordinatorAssistancePromise(method, params, blocking);
}

type WorkerTracingHooks = {
  readonly initialize: (url: string, serviceName: string) => void;
  readonly provide: <A, E, R>(
    effect: Effect.Effect<A, E, R>,
  ) => Effect.Effect<A, E, R>;
  readonly withParent: <A, E>(
    request: { readonly traceContext?: string },
    effect: Effect.Effect<A, E, never>,
  ) => Effect.Effect<A, E, never>;
};

let workerTracingHooks: WorkerTracingHooks = {
  initialize: () => {},
  provide: (effect) => effect,
  withParent: (_request, effect) => effect,
};

/**
 * Install Node-only tracing at the platform boundary. The browser worker leaves
 * the no-op hooks in place, so its bundle never imports OTEL or async_hooks.
 */
export function setWorkerTracingHooks(hooks: WorkerTracingHooks): void {
  workerTracingHooks = hooks;
}

export let workerId = 'uninitialized';

export function setWorkerId(id: string): void {
  workerId = id;
}

function symbolStateTracingEnabled(): boolean {
  return (
    (globalThis as Record<string, unknown>).__apexWorkerInitServerMode ===
    'development'
  );
}

type SymbolStateTableSnapshot = {
  readonly detailLevel: string | null;
  readonly tableVersion?: number;
  readonly parseCompleteness: string;
  readonly symbols: readonly unknown[];
  readonly references: readonly SymbolStateReference[];
  readonly cursorReferences: readonly SymbolStateReference[];
  readonly cursorSymbols: readonly SymbolStateSymbol[];
  readonly cursorPosition?: {
    readonly line: number;
    readonly character: number;
  };
};

function compactSymbolForState(symbol: unknown): unknown {
  const value = symbol as {
    id?: string;
    name?: string;
    kind?: unknown;
    parentId?: string | null;
    location?: unknown;
  };
  return {
    id: value.id,
    name: value.name,
    kind: String(value.kind ?? ''),
    parentId: value.parentId,
    location: value.location,
  };
}

function compactReferenceForState(reference: unknown): SymbolStateReference {
  const value = reference as {
    name?: string;
    context?: string | number;
    resolvedSymbolId?: string;
    location?: { identifierRange?: unknown };
    semanticContext?: unknown;
    chainNodes?: readonly unknown[];
  };
  return {
    name: value.name,
    context: value.context,
    range: value.location?.identifierRange,
    resolvedSymbolId: value.resolvedSymbolId,
    semanticContext: value.semanticContext,
    chainNodes: value.chainNodes?.map(compactReferenceForState),
  };
}

async function captureSymbolStateTable(
  svc: RequestServices | DataOwnerServices,
  uri: string,
  position?: { line: number; character: number },
): Promise<SymbolStateTableSnapshot> {
  const table = await svc.symbolManager.getSymbolTableForFile(uri);
  if (!table) {
    return {
      detailLevel: null,
      tableVersion: undefined,
      parseCompleteness: 'unknown',
      symbols: [],
      references: [],
      cursorReferences: [],
      cursorSymbols: [],
      cursorPosition: position
        ? { line: position.line + 1, character: position.character }
        : undefined,
    };
  }
  const tableSymbols = table.getAllSymbols();
  const symbols = tableSymbols.map(compactSymbolForState);
  const references = table.getAllReferences().map(compactReferenceForState);
  const parserPosition = position
    ? { line: position.line + 1, character: position.character }
    : undefined;
  const cursorReferences = parserPosition
    ? table
        .getReferencesAtPosition(parserPosition)
        .map(compactReferenceForState)
    : [];
  const cursorSymbols = parserPosition
    ? tableSymbols
        .filter((symbol) =>
          positionInParserRange(
            parserPosition,
            symbol.location?.identifierRange,
          ),
        )
        .map((symbol) => ({
          id: symbol.id,
          name: symbol.name,
          kind: String(symbol.kind),
          range: symbol.location?.identifierRange,
        }))
    : [];
  const metadata = table.getMetadata();
  return {
    detailLevel: table.getDetailLevel(),
    tableVersion: metadata.documentVersion,
    parseCompleteness: metadata.parseCompleteness,
    symbols,
    references,
    cursorReferences,
    cursorSymbols,
    cursorPosition: parserPosition,
  };
}

function symbolStateAttributes(
  input: Parameters<typeof recordSymbolStateEvent>[0],
): SymbolStateSpanAttributes {
  return symbolStateTracingEnabled() ? recordSymbolStateEvent(input) : {};
}

type ResourceLoaderLayerFactory = () => Promise<unknown>;

let _makeResourceLoaderRemoteLayer: ResourceLoaderLayerFactory = () => {
  throw new Error('resource loader layer factory not initialized');
};

export function setResourceLoaderLayerFactory(
  fn: ResourceLoaderLayerFactory,
): void {
  _makeResourceLoaderRemoteLayer = fn;
}

// 5th DI shim, not enumerated in the plan's 4-hook DI-boundary list: the
// WorkerRemoteStdlibWarmup handler (moving to shared in this task) calls
// warmRemoteStdlibNamespaceCache(), whose Node/Web bodies are structurally
// different (Node throws if the namespace map isn't initialized; Web
// swallows errors and has a differently-shaped response payload) and so
// stay in each platform shell, same rationale as makeResourceLoaderRemoteLayer.
type WarmRemoteStdlibNamespaceCache = () => Promise<void>;

let _warmRemoteStdlibNamespaceCache: WarmRemoteStdlibNamespaceCache = () => {
  throw new Error('remote stdlib namespace warmup not initialized');
};

export function setWarmRemoteStdlibNamespaceCache(
  fn: WarmRemoteStdlibNamespaceCache,
): void {
  _warmRemoteStdlibNamespaceCache = fn;
}

function warmRemoteStdlibNamespaceCacheShared(): Promise<void> {
  return _warmRemoteStdlibNamespaceCache();
}

export interface StandardNamespacePreloadResult {
  readonly namespaces: readonly string[];
  readonly loadedClasses: number;
  readonly totalClasses: number;
  readonly missingNamespaces: readonly string[];
  readonly failedClasses: readonly string[];
}

/**
 * Load configured stdlib namespaces into the DataOwner's authoritative graph.
 *
 * The ResourceLoaderService namespace map must already be warm. Keeping this
 * operation in the DataOwner avoids populating a coordinator-local graph that
 * worker-backed LSP requests never read.
 */
export async function preloadStandardNamespaces(
  svc: DataOwnerServices,
  configuredNamespaces: readonly string[],
): Promise<StandardNamespacePreloadResult> {
  const available = svc.stdlibProvider.getStandardNamespaces();
  const availableByLowerName = new Map(
    [...available.entries()].map(([namespace, classes]) => [
      namespace.toLowerCase(),
      { namespace, classes },
    ]),
  );

  const requested =
    configuredNamespaces.includes('*') && available.size > 0
      ? [...available.keys()]
      : configuredNamespaces;
  const selected = new Map<string, { namespace: string; classes: string[] }>();
  const missingNamespaces: string[] = [];

  for (const requestedNamespace of requested) {
    const match = availableByLowerName.get(requestedNamespace.toLowerCase());
    if (!match) {
      missingNamespaces.push(requestedNamespace);
      continue;
    }
    selected.set(match.namespace.toLowerCase(), match);
  }

  if (configuredNamespaces.includes('*') && available.size === 0) {
    missingNamespaces.push('*');
  }

  let loadedClasses = 0;
  let totalClasses = 0;
  const failedClasses: string[] = [];
  const classesToLoad: Array<{
    classPath: string;
    fqn: string;
  }> = [];

  for (const { namespace, classes } of selected.values()) {
    for (const classFile of classes) {
      if (!classFile.toLowerCase().endsWith('.cls')) {
        continue;
      }
      const className = classFile.replace(/\.cls$/i, '');
      classesToLoad.push({
        classPath: `${namespace}/${classFile}`,
        fqn: `${namespace}.${className}`,
      });
    }
  }

  totalClasses = classesToLoad.length;
  const serializedTables =
    classesToLoad.length === 0
      ? {}
      : ((await requestCoordinatorAssistancePromiseShared(
          'resourceLoader:getSymbolTables',
          { classPaths: classesToLoad.map(({ classPath }) => classPath) },
          true,
        )) as Record<string, unknown | null>);

  for (const { classPath, fqn } of classesToLoad) {
    const serialized = serializedTables[classPath];
    if (!serialized) {
      failedClasses.push(fqn);
      continue;
    }
    try {
      const table = SymbolTable.fromJSON(serialized);
      await Effect.runPromise(
        svc.symbolManager.addSymbolTable(
          table,
          `${STANDARD_APEX_LIBRARY_URI}/${classPath}`,
        ),
      );
      loadedClasses++;
    } catch {
      failedClasses.push(fqn);
    }
  }

  return {
    namespaces: [...selected.values()].map(({ namespace }) => namespace),
    loadedClasses,
    totalClasses,
    missingNamespaces,
    failedClasses,
  };
}

// ---------------------------------------------------------------------------
// Data-owner internal tiered queue (Step 5)
//
// Reads (QuerySymbolSubset, etc.) get priority over writes
// (WorkspaceBatchIngest, DispatchDocument*). The processing loop
// drains all pending reads before processing one write, preventing
// bulk ingestion from starving enrichment-worker symbol queries.
// ---------------------------------------------------------------------------

export interface DOQueueItem {
  readonly eff: Effect.Effect<unknown, unknown>;
  readonly deferred: Deferred.Deferred<unknown, unknown>;
  readonly enqueuedAt: number;
  readonly queueDepth: number;
  readonly parentSpan: Option.Option<Tracer.AnySpan>;
  readonly trace?: {
    readonly spanName: string;
    readonly attributes?: Readonly<Record<string, unknown>>;
  };
}

export interface DOQueues {
  readonly read: Queue.Queue<DOQueueItem>;
  readonly write: Queue.Queue<DOQueueItem>;
}

const processItem = (item: DOQueueItem) =>
  Effect.gen(function* () {
    let execution = item.eff;
    if (item.trace) {
      const queueWaitMs = Date.now() - item.enqueuedAt;
      execution = Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan({
          'data_owner.queue_wait_ms': queueWaitMs,
          'data_owner.queue_depth': item.queueDepth,
        });
        return yield* item.eff;
      }).pipe(
        Effect.withSpan(item.trace.spanName, {
          attributes: { ...item.trace.attributes },
        }),
      );
    }
    if (Option.isSome(item.parentSpan)) {
      execution = execution.pipe(Effect.withParentSpan(item.parentSpan.value));
    }

    // The queue loop is a daemon fiber created outside any individual worker
    // request runtime. Restoring only the parent span preserves IDs, but the
    // daemon still has the default no-op tracer, so its phase spans are never
    // exported. Re-provide the initialized worker tracer at the point where
    // queued work actually executes.
    execution = workerTracingHooks.provide(execution);

    const result = yield* Effect.exit(execution);
    yield* Deferred.done(item.deferred, result);
  });

const initDataOwnerQueues: Effect.Effect<DOQueues> = Effect.cached(
  Effect.gen(function* () {
    const read = yield* Queue.unbounded<DOQueueItem>();
    const write = yield* Queue.unbounded<DOQueueItem>();

    const loop = Effect.forever(
      Effect.gen(function* () {
        const reads = yield* Queue.takeAll(read);
        const readItems = Array.from(reads);
        for (const item of readItems) {
          yield* processItem(item);
        }

        const writeChunk = yield* Queue.takeUpTo(write, 1);
        const writeItems = Array.from(writeChunk);
        for (const item of writeItems) {
          yield* processItem(item);
        }

        if (readItems.length === 0 && writeItems.length === 0) {
          yield* Effect.sleep('1 millis');
        }
      }),
    );

    yield* Effect.forkDaemon(loop);
    return { read, write } satisfies DOQueues;
  }),
).pipe(Effect.runSync);

interface DataOwnerQueueTrace {
  readonly spanName: string;
  readonly attributes?: Readonly<Record<string, unknown>>;
}

export const dataOwnerRead = <A, E>(
  eff: Effect.Effect<A, E>,
  trace?: DataOwnerQueueTrace,
): Effect.Effect<A, E> =>
  Effect.gen(function* () {
    const queues = yield* initDataOwnerQueues;
    const deferred = yield* Deferred.make<A, E>();
    const queueDepth = yield* Queue.size(queues.read);
    const parentSpan = yield* Effect.option(Effect.currentSpan);
    yield* Queue.offer(queues.read, {
      eff: eff as Effect.Effect<unknown, unknown>,
      deferred: deferred as Deferred.Deferred<unknown, unknown>,
      enqueuedAt: Date.now(),
      queueDepth,
      parentSpan,
      trace,
    });
    return yield* Deferred.await(deferred);
  });

export const dataOwnerWrite = <A, E>(
  eff: Effect.Effect<A, E>,
  trace?: DataOwnerQueueTrace,
): Effect.Effect<A, E> =>
  Effect.gen(function* () {
    const queues = yield* initDataOwnerQueues;
    const deferred = yield* Deferred.make<A, E>();
    const queueDepth = yield* Queue.size(queues.write);
    const parentSpan = yield* Effect.option(Effect.currentSpan);
    yield* Queue.offer(queues.write, {
      eff: eff as Effect.Effect<unknown, unknown>,
      deferred: deferred as Deferred.Deferred<unknown, unknown>,
      enqueuedAt: Date.now(),
      queueDepth,
      parentSpan,
      trace,
    });
    return yield* Deferred.await(deferred);
  });

// ---------------------------------------------------------------------------
// Symbol-readiness latches (data-owner role)
//
// Gives the coordinator a deterministic readiness signal: a documentOpen/Change
// arms a per-URI latch at the
// incoming version (inside the serial WRITE handler, so it is ordered before
// the compile it triggers), and UpdateSymbolSubset resolves it the instant the
// write-back for that version merges.
//
// Concurrency constraint: the data-owner runs ONE serial fiber that awaits each
// queued effect to completion before the next (see initDataOwnerQueues). The
// latch's Deferred must therefore be *awaited off that fiber* — the
// AwaitSymbolReadiness handler only reads the latch handle through the runner
// (a fast, non-blocking peek) and awaits it on its own fiber. Resolving and
// arming are the only latch operations that run inside the serial runner, and
// neither blocks.
// ---------------------------------------------------------------------------

export interface ReadinessLatch {
  /** Editor version this latch is satisfied at. */
  version: number;
  /** Resolves (void) when a write-back for `version` merges. */
  deferred: Deferred.Deferred<void, never>;
  /** Idempotency guard so success/clear settle at most once. */
  settled: boolean;
}

export const readinessLatches = new Map<string, ReadinessLatch>();

/**
 * Arm (or re-arm) the readiness latch for a URI at a given version. Called from
 * the document open/change WRITE handlers, before their compile is dispatched.
 * A newer version supersedes an unsettled older latch: the old Deferred is
 * resolved so any awaiter for the stale version stops waiting and re-evaluates
 * against the current version (the coordinator will re-await if still cold).
 */
export function armReadiness(uri: string, version: number): void {
  const existing = readinessLatches.get(uri);
  if (existing && existing.version === version) {
    return; // already armed for this exact version
  }
  if (existing && !existing.settled) {
    // Stale latch (older version still pending, or a re-open). Release awaiters.
    existing.settled = true;
    Effect.runSync(Deferred.succeed(existing.deferred, undefined));
  }
  readinessLatches.set(uri, {
    version,
    deferred: Effect.runSync(Deferred.make<void, never>()),
    settled: false,
  });
}

/**
 * Resolve the readiness latch for a URI once a write-back for `version` merges.
 * Called from UpdateSymbolSubset's accepted branch. No-op if the latch was
 * superseded by a newer version (the merge was for a version nobody awaits).
 */
export function resolveReadiness(uri: string, version: number): void {
  const latch = readinessLatches.get(uri);
  if (latch && latch.version === version && !latch.settled) {
    latch.settled = true;
    Effect.runSync(Deferred.succeed(latch.deferred, undefined));
  }
}

/** Drop a URI's latch on close, releasing any awaiter. */
export function clearReadiness(uri: string): void {
  const latch = readinessLatches.get(uri);
  if (latch && !latch.settled) {
    latch.settled = true;
    Effect.runSync(Deferred.succeed(latch.deferred, undefined));
  }
  readinessLatches.delete(uri);
}

/**
 * Whether the symbols currently in the graph for `uri` are CURRENT for what an
 * AwaitSymbolReadiness caller is waiting on. Used by both the initial peek and
 * the post-wake re-peek so they cannot drift.
 *
 * `hasSymbols` is whether a symbol table is present at all. `reqVersion < 0`
 * means "match the LATEST armed version" (the coordinator gate, whose
 * triggering request carries no version).
 *
 * A present table is current only if the MERGED version (DocumentStateCache's
 * documentVersion, bumped solely on an accepted write-back) has reached the
 * version we require:
 *   - no latch armed ⇒ nothing is compiling, any present table is current;
 *   - latch armed ⇒ require mergedVersion ≥ latch.version (matchLatest) or
 *     ≥ max(reqVersion, latch.version) (explicit).
 * Critically this does NOT trust latch.settled: a latch also settles on a
 * REJECTED or SUPERSEDED write-back that merged nothing, leaving the prior
 * version's symbols in the graph — reporting those as ready is a stale read.
 */
export function symbolsAreCurrent(
  uri: string,
  reqVersion: number,
  hasSymbols: boolean,
): boolean {
  if (!hasSymbols) return false;
  const latch = readinessLatches.get(uri);
  if (!latch) return true;
  const mergedVersion =
    getDocumentStateCache().getCurrentState(uri)?.documentVersion ?? -1;
  const requiredVersion =
    reqVersion < 0 ? latch.version : Math.max(reqVersion, latch.version);
  return mergedVersion >= requiredVersion;
}

// ---------------------------------------------------------------------------
// Handler factories & request types
//
// The outer shell (guardRole → dataOwnerWrite/ensureRequestServices) is
// identical across handlers; each factory captures the shared shell and
// leaves the caller to supply only the unique body logic.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Data-owner document handler factory
//
// The outer shell (guardRole → dataOwnerWrite → ensureDataOwnerServices)
// is identical for all document mutation handlers. The factory captures
// this; each handler only provides its unique body logic.
// ---------------------------------------------------------------------------

export const dataOwnerDocHandler =
  <R, A>(
    tag: string,
    body: (svc: DataOwnerServices, req: R) => Effect.Effect<A>,
  ) =>
  (req: R) =>
    guardRole(tag).pipe(
      Effect.flatMap(() =>
        dataOwnerWrite(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;
            return yield* body(svc, req);
          }),
        ),
      ),
    );

// ---------------------------------------------------------------------------
// Enrichment handler factory
//
// All enrichment dispatch handlers follow the same pattern: guard the
// role, lazily bootstrap services, call a service method, clone the
// result for structured-clone-safe postMessage. The factory captures
// this pattern; each handler is a one-liner config.
// ---------------------------------------------------------------------------

export const requestHandler =
  <R>(
    tag: string,
    callService: (svc: RequestServices, req: R) => Promise<unknown>,
  ) =>
  (req: R) =>
    guardRole(tag).pipe(
      Effect.flatMap(() =>
        workerTracingHooks.withParent(
          req as { traceContext?: string },
          Effect.fn(`worker.lspRequest.${tag}`, {
            attributes: { telemetryIgnore: true },
          })(function* () {
            const svc = yield* ensureRequestServices;
            const result = yield* Effect.promise(() => callService(svc, req));
            return { result: cloneForWire(result) };
          })(),
        ),
      ),
    );

/**
 * Effect-returning request handler variant for handlers that need to yield*
 * Effect-returning helpers (e.g. loadSymbolDataForEnrichment after Part B
 * conversion). Identical to requestHandler except callService returns an Effect
 * and is yielded directly instead of wrapped in Effect.promise.
 */
export const effectRequestHandler =
  <R>(
    tag: string,
    callService: (
      svc: RequestServices,
      req: R,
    ) => Effect.Effect<unknown, never, never>,
  ) =>
  (req: R) =>
    guardRole(tag).pipe(
      Effect.flatMap(() =>
        workerTracingHooks.withParent(
          req as { traceContext?: string },
          Effect.fn(`worker.lspRequest.${tag}`, {
            attributes: { telemetryIgnore: true },
          })(function* () {
            const svc = yield* ensureRequestServices;
            const result = yield* callService(svc, req);
            return { result: cloneForWire(result) };
          })(),
        ),
      ),
    );

export type PositionReq = {
  textDocument: { uri: string };
  position: { line: number; character: number };
  content?: string;
  documentVersion?: number;
};
export type DocOnlyReq = {
  textDocument: { uri: string };
  content?: string;
};
export type DocWithContentReq = {
  textDocument: { uri: string };
  content?: string;
};
export type RefsReq = PositionReq & {
  context: { includeDeclaration: boolean };
};
export type RenameReq = PositionReq & {
  newName: string;
};
export type CompletionReq = PositionReq & {
  context?: { triggerKind: number; triggerCharacter?: string };
};

export function completionResultForWire(result: {
  readonly items: unknown[];
  readonly isIncomplete: boolean;
}): { readonly items: unknown[]; readonly isIncomplete: boolean } {
  return {
    items: result.items,
    isIncomplete: result.isIncomplete,
  };
}
export type SignatureHelpReq = PositionReq & { context?: unknown };
export type CodeActionReq = {
  textDocument: { uri: string };
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  content?: string;
  context?: unknown;
};

// ---------------------------------------------------------------------------
// Enrichment helpers
// ---------------------------------------------------------------------------

export interface EnrichmentLoadOptions {
  /** Materialize every cross-file edge in the cursor file. */
  readonly materializeCrossFileReferences?: boolean;
  /** Preserve an unchanged full-detail cursor table owned by this worker. */
  readonly reuseCompiledCursor?: boolean;
  /** Cursor-target preparation loads dependencies after full-detail compile. */
  readonly deferDependencyPrefetch?: boolean;
  /** Exact live document version used to validate a local cursor fast path. */
  readonly sourceVersion?: number;
  /** Enable metadata-only or skipped owner queries for cursor preparation. */
  readonly allowOwnerQuerySkip?: boolean;
  readonly telemetry?: {
    reusedLocalTables?: number;
    ingestedTables?: number;
    ownerQuerySkipped?: boolean;
    ownerMetadataOnly?: boolean;
  };
}

interface FullDetailCursorCacheEntry {
  readonly content: string;
  readonly sourceVersion: number;
  readonly table: unknown;
}

const fullDetailCursorBySymbolManager = new WeakMap<
  RequestServices['symbolManager'],
  Map<string, FullDetailCursorCacheEntry>
>();
const MAX_FULL_DETAIL_CURSOR_CACHE_ENTRIES = 32;

/**
 * Load symbol data from the data-owner worker into the local enrichment
 * worker's symbol manager. Stores the document text in local storage
 * and queries the data-owner for the file's symbol table via the
 * coordinator assistance proxy.
 *
 * Returns version and detail level metadata for the loaded URI.
 */
export function loadSymbolDataForEnrichment(
  svc: RequestServices,
  uri: string,
  content?: string,
  options: EnrichmentLoadOptions = {},
): Effect.Effect<
  { version: number; detailLevel: string; localDetailLevel?: string },
  never,
  never
> {
  let version = -1;
  let detailLevel = 'public-api';
  let reusedLocalTables = 0;
  let ingestedTables = 0;
  const materializeCrossFileReferences =
    options.materializeCrossFileReferences ?? true;
  const ownerMetadataOnly =
    options.allowOwnerQuerySkip === true && content !== undefined;
  const localDetailLevel: string | undefined = ownerMetadataOnly
    ? 'public-api'
    : undefined;

  return Effect.gen(function* () {
    if (content !== undefined) {
      // Completion needs offsetAt/positionAt for live-buffer analysis.
      const doc = makeWorkerDocument(uri, content);
      svc.storageManager.getStorage().setDocument(uri, doc as never);
    }

    if (
      options.allowOwnerQuerySkip &&
      options.reuseCompiledCursor &&
      content !== undefined &&
      options.sourceVersion !== undefined
    ) {
      const cached = fullDetailCursorBySymbolManager
        .get(svc.symbolManager)
        ?.get(uri);
      const currentTable = yield* Effect.promise(() =>
        svc.symbolManager.getSymbolTableForFile(uri),
      );
      const currentDetail = currentTable?.getDetailLevel();
      if (
        cached?.content === content &&
        cached.sourceVersion === options.sourceVersion &&
        cached.table === currentTable &&
        currentDetail === 'full'
      ) {
        reusedLocalTables = 1;
        if (options.telemetry) {
          options.telemetry.reusedLocalTables = reusedLocalTables;
          options.telemetry.ingestedTables = ingestedTables;
          options.telemetry.ownerQuerySkipped = true;
        }
        return {
          version: options.sourceVersion,
          detailLevel: currentDetail,
        };
      }
    }

    const response = (yield* Effect.fn('worker.enrichment.querySymbolSubset', {
      attributes: { uri, 'query.include_entries': !ownerMetadataOnly },
    })(function* () {
      return (yield* Effect.tryPromise({
        try: () =>
          requestCoordinatorAssistancePromiseShared(
            'dataOwner:QuerySymbolSubset',
            { uris: [uri], includeEntries: !ownerMetadataOnly },
            true,
          ),
        catch: (cause) => cause,
      })) as {
        entries: Record<string, unknown>;
        versions: Record<string, number>;
        detailLevels: Record<string, string>;
      };
    })()) as {
      entries: Record<string, unknown>;
      versions: Record<string, number>;
      detailLevels: Record<string, string>;
    };

    version = response?.versions?.[uri] ?? -1;
    detailLevel = response?.detailLevels?.[uri] ?? 'public-api';

    if (!ownerMetadataOnly && response?.entries) {
      const { SymbolTable, ReferenceContext } = yield* Effect.tryPromise({
        try: () => import('@salesforce/apex-lsp-parser-ast'),
        catch: (cause) => cause,
      });
      const ingestEntries = (entries: Record<string, unknown>) => {
        const tables: Array<{ fileUri: string; st: any }> = [];
        for (const [fileUri, stData] of Object.entries(entries)) {
          if (stData) {
            tables.push({
              fileUri,
              st: SymbolTable.fromSerializedData(
                stData as SerializedSymbolTableData,
              ),
            });
          }
        }
        return tables;
      };

      const entriesToLoad: Record<string, unknown> = {};
      let reusedCursorTable: any | undefined;
      for (const [fileUri, stData] of Object.entries(response.entries)) {
        let reuse = false;
        if (
          options.reuseCompiledCursor &&
          fileUri === uri &&
          content !== undefined
        ) {
          const cached = fullDetailCursorBySymbolManager
            .get(svc.symbolManager)
            ?.get(uri);
          const existing = yield* Effect.promise(() =>
            svc.symbolManager.getSymbolTableForFile(fileUri),
          );
          reuse =
            cached !== undefined &&
            cached.table !== undefined &&
            cached.content === content &&
            cached.sourceVersion === version &&
            cached.table === existing;
          if (reuse) reusedCursorTable = existing;
        }
        if (reuse) {
          reusedLocalTables++;
        } else {
          entriesToLoad[fileUri] = stData;
        }
      }

      const loaded = yield* Effect.fn(
        'worker.enrichment.deserializeSymbolTables',
        {
          attributes: {
            uri,
            count: Object.keys(entriesToLoad).length,
            'cache.reused_count': reusedLocalTables,
          },
        },
      )(function* () {
        return yield* Effect.sync(() => ingestEntries(entriesToLoad));
      })();
      for (const { fileUri, st } of loaded) {
        yield* Effect.fn('worker.enrichment.addSymbolTable', {
          attributes: { uri: fileUri },
        })(function* () {
          yield* svc.symbolManager.addSymbolTable(st, fileUri);
        })();
        ingestedTables++;
      }

      // Phase 2: pre-fetch cross-file dependencies.
      // Extract unresolved CLASS_REFERENCE / CONSTRUCTOR_CALL names from the
      // loaded file and ask the data-owner to resolve them to symbol tables.
      const currentSt =
        loaded.find((e) => e.fileUri === uri)?.st ?? reusedCursorTable;
      if (currentSt && !options.deferDependencyPrefetch) {
        const refs = currentSt.getAllReferences() as Array<{
          name: string;
          context: number;
          resolvedSymbolId?: string;
        }>;
        const classNames = new Set<string>();
        for (const ref of refs) {
          const isUnresolvedTypeRef =
            !ref.resolvedSymbolId &&
            (ref.context === ReferenceContext.CLASS_REFERENCE ||
              ref.context === ReferenceContext.CONSTRUCTOR_CALL ||
              ref.context === ReferenceContext.TYPE_DECLARATION);
          const isSupertypeRef =
            ref.context === ReferenceContext.INHERITANCE ||
            ref.context === ReferenceContext.INTERFACE_IMPLEMENTATION;
          if (isUnresolvedTypeRef || isSupertypeRef) {
            classNames.add(ref.name);
          }
        }
        if (classNames.size > 0) {
          const depResponse = yield* Effect.fn(
            'worker.enrichment.resolveDepUris',
            { attributes: { uri, depCount: classNames.size } },
          )(function* () {
            return (yield* Effect.tryPromise({
              try: () =>
                requestCoordinatorAssistancePromiseShared(
                  'dataOwner:ResolveDepUris',
                  { classNames: [...classNames] },
                  true,
                ),
              catch: (cause) => cause,
            })) as { entries: Record<string, unknown> };
          })().pipe(Effect.catchAll(() => Effect.succeed(undefined)));
          if (depResponse?.entries) {
            const dependencies = ingestEntries(depResponse.entries);
            yield* Effect.fn('worker.enrichment.ingestDependencies', {
              attributes: { uri, count: dependencies.length },
            })(function* () {
              for (const { fileUri: depUri, st: depSt } of dependencies) {
                yield* svc.symbolManager.addSymbolTable(depSt, depUri);
              }
            })();
          }

          // Cross-worker fallback: ResolveDepUris resolves names that map to a
          // file via the data-owner's class→file index, but a qualified
          // TypeReference can still miss when the target file is not loaded in
          // this enrichment worker's LOCAL name index. Ask the data-owner
          // (which holds ALL workspace symbols) to resolve the remaining names
          // in one batched query and ingest the owning files' symbol tables.
          // The ingest count is intentionally not captured (see below).
          yield* Effect.fn('worker.enrichment.resolveMissingNames', {
            attributes: { uri, candidateCount: classNames.size },
          })(function* () {
            const ingested = yield* Effect.tryPromise({
              try: () => resolveMissingNamesViaDataOwner(svc, [...classNames]),
              catch: (cause) => cause,
            }).pipe(Effect.catchAll(() => Effect.succeed(0)));
            yield* Effect.annotateCurrentSpan({ ingested });
          })();

          // Ingestion alone only lands the owning files' SYMBOLS in the local
          // name index (addSymbolTable processes same-file refs only and defers
          // cross-file edges). Hover/Completion/Definition resolve via an
          // on-demand name lookup, so the symbol is enough for them — but the
          // requesting file's TypeReference is still unresolved (no
          // resolvedSymbolId, no reverse-index edge). Materialize those edges
          // now so reverse-index + position-precise consumers see them too.
          //
          // NOT gated on resolveMissingNamesViaDataOwner's ingest count: the
          // earlier ResolveDepUris pass may have already loaded every dep, which
          // makes that count 0 even though the cursor file's references are
          // still unbound. find-references' 'precise' position→symbol lookup
          // needs those bindings (unlike hover/definition's on-demand by-name
          // resolution), so resolve whenever ANY class dep was requested.
          // resolveCrossFileReferencesForFile is re-entrancy-guarded and
          // addReference de-dupes, so this is near-free when nothing changed.
          if (materializeCrossFileReferences) {
            yield* Effect.fn('worker.enrichment.resolveCrossFileReferences', {
              attributes: { uri },
            })(function* () {
              yield* svc.symbolManager.resolveCrossFileReferencesForFile(uri);
            })();
          }
        }
      }
    }

    yield* Effect.annotateCurrentSpan({
      'enrichment.local_tables_reused': reusedLocalTables,
      'enrichment.tables_ingested': ingestedTables,
      'enrichment.cross_file_materialized': materializeCrossFileReferences,
      'enrichment.owner_metadata_only': ownerMetadataOnly,
    });
    if (options.telemetry) {
      options.telemetry.reusedLocalTables = reusedLocalTables;
      options.telemetry.ingestedTables = ingestedTables;
      options.telemetry.ownerMetadataOnly = ownerMetadataOnly;
    }
    return {
      version,
      detailLevel,
      ...(localDetailLevel === undefined ? {} : { localDetailLevel }),
    };
  }).pipe(
    Effect.catchAll((error) =>
      Effect.sync(() => {
        // Assistance failures are expected during degradation. Preserve the
        // partial graph and let the LSP request continue.
        getLogger().warn(
          () =>
            `[ENRICHMENT] Symbol-subset load failed for ${uri}: ${String(error)}`,
        );
        if (options.telemetry) {
          options.telemetry.reusedLocalTables = reusedLocalTables;
          options.telemetry.ingestedTables = ingestedTables;
        }
        return {
          version,
          detailLevel,
          ...(localDetailLevel === undefined ? {} : { localDetailLevel }),
        };
      }),
    ),
  );
}

/**
 * Code Lens only inspects symbols declared in the requested file. It does not
 * resolve types, references, or members, so loading dependencies and
 * materializing cross-file edges cannot affect its result.
 */
export function loadCodeLensSymbolData(
  svc: RequestServices,
  uri: string,
): Effect.Effect<
  { version: number; detailLevel: string; localDetailLevel?: string },
  never,
  never
> {
  return loadSymbolDataForEnrichment(svc, uri, undefined, {
    materializeCrossFileReferences: false,
    deferDependencyPrefetch: true,
  });
}

interface CursorTargetDependencyTelemetry {
  candidateCount: number;
  localHitCount: number;
  requestedCount: number;
  ingestedCount: number;
}

type DependencyTypeShape = {
  name?: string;
  isArray?: boolean;
  isPrimitive?: boolean;
  isBuiltIn?: boolean;
  namespace?: string | { name?: string; global?: string };
  typeParameters?: DependencyTypeShape[];
  keyType?: DependencyTypeShape;
  resolvedType?: DependencyTypeShape;
  resolvedSymbol?: { id?: string; name?: string; fqn?: string };
};

type DependencyCursorReference = {
  name: string;
  context: number;
  resolvedSymbolId?: string;
  resolvedTypeId?: string;
  semanticContext?: {
    memberAccess?: {
      operatorRange: {
        startLine: number;
        startColumn: number;
        endLine: number;
        endColumn: number;
      };
      memberRange?: {
        startLine: number;
        startColumn: number;
        endLine: number;
        endColumn: number;
      };
      incomplete: boolean;
    };
  };
  location?: {
    identifierRange?: {
      startLine: number;
      startColumn: number;
      endLine: number;
      endColumn: number;
    };
  };
  chainNodes?: DependencyCursorReference[];
};

const positionInParserRange = (
  position: { line: number; character: number },
  range:
    | {
        startLine: number;
        startColumn: number;
        endLine: number;
        endColumn: number;
      }
    | undefined,
): boolean =>
  range !== undefined &&
  (position.line > range.startLine ||
    (position.line === range.startLine &&
      position.character >= range.startColumn)) &&
  (position.line < range.endLine ||
    (position.line === range.endLine && position.character <= range.endColumn));

/** Select only parser references whose token or member-access range owns the cursor. */
export const dependencyReferencesAtCursor = (
  references: DependencyCursorReference[],
  position: { line: number; character: number },
): DependencyCursorReference[] => {
  const exact = references.filter((reference) =>
    positionInParserRange(position, reference.location?.identifierRange),
  );
  if (exact.length > 0) {
    const rangeSize = (reference: DependencyCursorReference): number => {
      const range = reference.location?.identifierRange;
      if (!range) return Number.POSITIVE_INFINITY;
      return (
        (range.endLine - range.startLine) * 1_000_000 +
        (range.endColumn - range.startColumn)
      );
    };
    const narrowest = Math.min(...exact.map(rangeSize));
    return exact.filter((reference) => rangeSize(reference) === narrowest);
  }

  return references.filter((reference) => {
    const access = reference.semanticContext?.memberAccess;
    if (!access) return false;
    const end = access.memberRange ?? access.operatorRange;
    return positionInParserRange(position, {
      startLine: access.operatorRange.startLine,
      startColumn: access.operatorRange.endColumn,
      endLine: end.endLine,
      endColumn: end.endColumn,
    });
  });
};

/**
 * Load only type tables that can participate in the expression at the cursor.
 * The full-detail cursor table must already be installed so body references,
 * local variable types, method return types, and receiver keywords are visible.
 */
const cursorTableResolutionInFlight = new WeakMap<object, Promise<void>>();

async function materializeCursorCrossFileReferences(
  svc: RequestServices,
  uri: string,
  symbolTable: object,
): Promise<void> {
  const existing = cursorTableResolutionInFlight.get(symbolTable);
  if (existing) return existing;

  const resolution = Effect.runPromise(
    svc.symbolManager.resolveCrossFileReferencesForFile(uri).pipe(
      Effect.tapError((error) =>
        Effect.logDebug(
          `[ENRICHMENT] Cursor cross-file resolution failed for ${uri}: ${String(error)}`,
        ),
      ),
      Effect.catchAll(() => Effect.void),
    ),
  ).finally(() => {
    if (cursorTableResolutionInFlight.get(symbolTable) === resolution) {
      cursorTableResolutionInFlight.delete(symbolTable);
    }
  });
  cursorTableResolutionInFlight.set(symbolTable, resolution);
  return resolution;
}

function loadCursorTargetDependencies(
  svc: RequestServices,
  requestType: LSPRequestType,
  uri: string,
  position: { line: number; character: number },
): Effect.Effect<CursorTargetDependencyTelemetry, never, never> {
  return Effect.fn('worker.enrichment.loadCursorTargetDependencies', {
    attributes: { uri },
  })(function* () {
    const empty: CursorTargetDependencyTelemetry = {
      candidateCount: 0,
      localHitCount: 0,
      requestedCount: 0,
      ingestedCount: 0,
    };
    const symbolTable = yield* Effect.promise(() =>
      svc.symbolManager.getSymbolTableForFile(uri),
    );
    if (!symbolTable) return empty;

    const { ReferenceContext, SObjectRegistry, SymbolKind, SymbolTable } =
      yield* Effect.promise(() => import('@salesforce/apex-lsp-parser-ast'));
    const parserPosition = {
      line: position.line + 1,
      character: position.character,
    };
    let references = dependencyReferencesAtCursor(
      symbolTable.getReferencesAtPosition(
        parserPosition,
      ) as DependencyCursorReference[],
      parserPosition,
    );
    if (references.length === 0) {
      references = dependencyReferencesAtCursor(
        symbolTable.getAllReferences() as DependencyCursorReference[],
        parserPosition,
      );
    }
    const cursorReferenceNodes = references.flatMap((reference) => [
      reference,
      ...(reference.chainNodes ?? []),
    ]);
    const needsCrossFileResolution = cursorReferenceNodes.some(
      (reference) =>
        !reference.resolvedSymbolId &&
        !reference.resolvedTypeId &&
        reference.name.toLowerCase() !== 'this' &&
        reference.name.toLowerCase() !== 'super',
    );
    const candidateNames = new Map<
      string,
      { name: string; exactFqn?: string }
    >();
    const addCandidate = (
      name: string | undefined,
      exactFqn?: string,
    ): void => {
      if (!name) return;
      const lower = name.toLowerCase();
      if (['this', 'super', 'unknown', 'void', 'null'].includes(lower)) return;
      candidateNames.set((exactFqn ?? name).toLowerCase(), {
        name,
        ...(exactFqn ? { exactFqn } : {}),
      });
    };
    const visitedTypes = new Set<object>();
    const pendingResolvedSymbolIds = new Set<string>();
    const addTypeInfoCandidate = (value: unknown): void => {
      if (!value || typeof value !== 'object' || visitedTypes.has(value))
        return;
      visitedTypes.add(value);
      const type = value as DependencyTypeShape;
      const resolvedFqn = type.resolvedSymbol?.fqn;
      const namespace =
        typeof type.namespace === 'string'
          ? type.namespace
          : (type.namespace?.name ?? type.namespace?.global);
      const structuredFqn =
        namespace && type.name ? `${namespace}.${type.name}` : undefined;
      const exactFqn = resolvedFqn ?? structuredFqn;
      if (!type.isArray && !type.isPrimitive && !type.isBuiltIn) {
        addCandidate(exactFqn ?? type.name, exactFqn);
      }
      addTypeInfoCandidate(type.keyType);
      for (const parameter of type.typeParameters ?? []) {
        addTypeInfoCandidate(parameter);
      }
      addTypeInfoCandidate(type.resolvedType);
      if (type.resolvedSymbol?.id) {
        pendingResolvedSymbolIds.add(type.resolvedSymbol.id);
      }
    };

    const loadedResolvedSymbols = new Map<string, ApexSymbol | null>();

    const addResolvedSymbolType = function* (
      resolvedSymbolId: string | undefined,
      includeSymbolIdentity = false,
    ) {
      if (!resolvedSymbolId) return;
      let symbol = loadedResolvedSymbols.get(resolvedSymbolId);
      if (!loadedResolvedSymbols.has(resolvedSymbolId)) {
        symbol = yield* Effect.promise(() =>
          svc.symbolManager.getSymbol(resolvedSymbolId),
        );
        loadedResolvedSymbols.set(resolvedSymbolId, symbol ?? null);
      }
      if (!symbol) return;
      if (includeSymbolIdentity) {
        const symbolFqn = 'fqn' in symbol ? symbol.fqn : undefined;
        addCandidate(symbolFqn ?? symbol.name, symbolFqn);
      }
      if ('type' in symbol) addTypeInfoCandidate(symbol.type);
      if (symbol && 'returnType' in symbol) {
        addTypeInfoCandidate(symbol.returnType);
      }
    };

    for (const reference of references) {
      if (
        reference.context === ReferenceContext.CLASS_REFERENCE ||
        reference.context === ReferenceContext.CONSTRUCTOR_CALL ||
        reference.context === ReferenceContext.TYPE_DECLARATION ||
        reference.context === ReferenceContext.INHERITANCE ||
        reference.context === ReferenceContext.INTERFACE_IMPLEMENTATION
      ) {
        addCandidate(reference.name);
      }
      yield* addResolvedSymbolType(reference.resolvedSymbolId);
      yield* addResolvedSymbolType(reference.resolvedTypeId, true);
      for (const node of reference.chainNodes ?? []) {
        if (
          node.context === ReferenceContext.CLASS_REFERENCE ||
          node.context === ReferenceContext.CONSTRUCTOR_CALL ||
          node.context === ReferenceContext.TYPE_DECLARATION
        ) {
          addCandidate(node.name);
        }
        yield* addResolvedSymbolType(node.resolvedSymbolId);
        yield* addResolvedSymbolType(node.resolvedTypeId, true);
      }
    }

    for (const resolvedSymbolId of pendingResolvedSymbolIds) {
      yield* addResolvedSymbolType(resolvedSymbolId, true);
    }

    // `this.member`, `super.member`, and omitted member calls can resolve in a
    // declared supertypes. Include only the immediate parser-owned hierarchy
    // edges; member lookup walks already-loaded ancestors and a later miss
    // remains observable.
    const receiverReferences = references.flatMap((reference) => [
      reference,
      ...(reference.chainNodes ?? []),
    ]);
    const needsReceiverHierarchy = receiverReferences.some((reference) => {
      const lower = reference.name.toLowerCase();
      return (
        lower === 'super' ||
        lower.startsWith('super.') ||
        ((reference.context === ReferenceContext.METHOD_CALL ||
          reference.context === ReferenceContext.FIELD_ACCESS) &&
          !reference.resolvedSymbolId)
      );
    });
    if (needsReceiverHierarchy) {
      const allSymbols = symbolTable.getAllSymbols();
      const symbolsById = new Map(
        allSymbols.map((symbol) => [symbol.id, symbol]),
      );
      const hierarchy = symbolTable.getScopeHierarchy(parserPosition);
      let current = symbolsById.get(hierarchy.at(-1)?.id ?? '');
      const visited = new Set<string>();
      while (current && !visited.has(current.id)) {
        visited.add(current.id);
        if (
          current.kind === SymbolKind.Class ||
          current.kind === SymbolKind.Interface
        ) {
          const superClass =
            'superClass' in current && typeof current.superClass === 'string'
              ? current.superClass
              : undefined;
          addCandidate(superClass);
          if ('interfaces' in current && Array.isArray(current.interfaces)) {
            for (const interfaceName of current.interfaces) {
              if (typeof interfaceName === 'string') {
                addCandidate(interfaceName);
              }
            }
          }
          break;
        }
        current = current.parentId
          ? symbolsById.get(current.parentId)
          : undefined;
      }
    }

    const missingNames: string[] = [];
    let localHitCount = 0;
    for (const candidateName of candidateNames.values()) {
      const exact = yield* Effect.promise(() =>
        svc.symbolManager.findSymbolByFQN(
          candidateName.exactFqn ?? candidateName.name,
        ),
      );
      const candidates = exact
        ? [exact]
        : yield* Effect.promise(() =>
            svc.symbolManager.findSymbolByName(candidateName.name),
          );
      let locallyAvailable = false;
      for (const candidate of candidates) {
        if (!candidate.fileUri) continue;
        const table = yield* Effect.promise(() =>
          svc.symbolManager.getSymbolTableForFile(candidate.fileUri!),
        );
        if (table && table.getMetadata().parseCompleteness !== 'incomplete') {
          locallyAvailable = true;
          break;
        }
      }
      if (locallyAvailable) localHitCount++;
      else if (candidates.length <= 1) missingNames.push(candidateName.name);
    }

    let ingestedCount = 0;
    if (missingNames.length > 0) {
      const response = (yield* Effect.tryPromise({
        try: () =>
          requestCoordinatorAssistancePromiseShared(
            'dataOwner:ResolveDepUris',
            { classNames: missingNames },
            true,
          ),
        catch: (cause) => cause,
      }).pipe(Effect.catchAll(() => Effect.succeed(undefined)))) as
        { entries?: Record<string, unknown> } | undefined;
      for (const [fileUri, data] of Object.entries(response?.entries ?? {})) {
        if (!data) continue;
        const table = SymbolTable.fromSerializedData(
          data as SerializedSymbolTableData,
        );
        yield* svc.symbolManager.addSymbolTable(table, fileUri);
        ingestedCount++;
      }
      const fallbackIngested = yield* Effect.tryPromise({
        try: () => resolveMissingNamesViaDataOwner(svc, missingNames),
        catch: () => 0,
      }).pipe(Effect.catchAll(() => Effect.succeed(0)));
      ingestedCount += fallbackIngested;

      // A cursor-target miss can be the first semantic observation of an org
      // SObject. The data owner cannot return a table it has never seen, so
      // forward only parser-evidenced SObject type references through the
      // existing missing-artifact service, then retry the data-owner ingest.
      // No document text is inspected here.
      const requestKinds = new Set([
        'definition',
        'implementation',
        'hover',
        'references',
        'completion',
        'signatureHelp',
      ]);
      const artifactRequestKind = requestKinds.has(requestType)
        ? (requestType as
            | 'definition'
            | 'implementation'
            | 'hover'
            | 'references'
            | 'completion'
            | 'signatureHelp')
        : 'references';
      const metadata = symbolTable.getMetadata();
      const allReferences = symbolTable.getAllReferences();
      const hasMemberAccessAtCursor = references.some(
        (reference) =>
          reference.context === ReferenceContext.FIELD_ACCESS ||
          (reference.chainNodes?.length ?? 0) >= 2 ||
          reference.semanticContext?.memberAccess !== undefined,
      );
      const stillMissingNames = yield* Effect.promise(() =>
        Promise.all(
          missingNames.map(async (name) => ({
            name,
            available: await hasCompleteLocalSymbolTable(svc, name),
          })),
        ).then((results) =>
          results
            .filter((result) => !result.available)
            .map((result) => result.name),
        ),
      );
      const sObjectIdentifiers = hasMemberAccessAtCursor
        ? stillMissingNames.flatMap((name) => {
            const normalizedName = name.toLowerCase();
            const reference = allReferences.find((candidate) => {
              const candidateName = candidate.name
                .split('.')
                .pop()
                ?.toLowerCase();
              return (
                candidateName === normalizedName &&
                (candidate.isSObject === true ||
                  candidate.context === ReferenceContext.SOQL_FROM_TYPE ||
                  SObjectRegistry.isCustomSObjectName(candidate.name))
              );
            });
            if (!reference) return [];
            return [
              {
                name,
                identifierType: 'sobject' as const,
                provenance: {
                  sourceUri: uri,
                  ...(metadata.documentVersion !== undefined && {
                    documentVersion: metadata.documentVersion,
                  }),
                  referenceRange: reference.location.identifierRange,
                  referenceIdentity: referenceIdentity(reference),
                  ...(reference.resolvedSymbolId && {
                    resolvedSymbolId: reference.resolvedSymbolId,
                  }),
                  ...(reference.resolvedTypeId && {
                    resolvedTypeId: reference.resolvedTypeId,
                  }),
                  parseCompleteness: metadata.parseCompleteness ?? 'unknown',
                },
              },
            ];
          })
        : [];

      if (sObjectIdentifiers.length > 0) {
        const artifactParams = {
          identifiers: sObjectIdentifiers,
          origin: {
            uri,
            position,
            requestKind: artifactRequestKind,
          },
          mode: 'blocking' as const,
        };
        const artifactLoadingEnabled =
          ApexSettingsManager.getInstance().getSettings().apex
            .findMissingArtifact.enabled;
        const rawArtifactResult = artifactLoadingEnabled
          ? yield* Effect.tryPromise({
              try: () =>
                requestCoordinatorAssistancePromiseShared(
                  'apex/findMissingArtifact',
                  artifactParams,
                  true,
                ),
              catch: () => undefined,
            }).pipe(Effect.catchAll(() => Effect.succeed(undefined)))
          : undefined;
        const { decodeFindMissingArtifactResult } = yield* Effect.promise(
          () => import('@salesforce/apex-lsp-compliant-services'),
        );
        const artifactResult = decodeFindMissingArtifactResult(
          rawArtifactResult,
          artifactParams,
        );
        if (artifactResult && 'artifacts' in artifactResult) {
          for (const artifact of artifactResult.artifacts) {
            const ownerUri = ownerUriForSObject(artifact.name);
            const existing = yield* Effect.promise(() =>
              svc.symbolManager.getSymbolTableForFile(ownerUri),
            );
            const version = (existing?.getMetadata().documentVersion ?? 0) + 1;
            const table = yield* Effect.try({
              try: () => composeSObjectSymbolTable(artifact.describe, version),
              catch: (error) => error,
            }).pipe(
              Effect.catchAll((error) =>
                Effect.logWarning(
                  `[ENRICHMENT] Rejected malformed sObject artifact ${artifact.name}: ${error}`,
                ).pipe(Effect.as(undefined)),
              ),
            );
            if (!table) {
              continue;
            }
            yield* svc.symbolManager.addSymbolTable(
              table,
              ownerUri,
              version,
              false,
            );
            ingestedCount++;
          }
        }
        // The coordinator installs validated payloads into the authoritative
        // data owner before replying. Retry that source even when the local
        // outcome is conservative (for example, a rolling-upgrade decoder
        // rejects a response shape) so the current request can observe the
        // authoritative table without waiting for another keystroke.
        const artifactIngested = yield* Effect.tryPromise({
          try: () =>
            resolveMissingNamesViaDataOwner(
              svc,
              sObjectIdentifiers.map((identifier) => identifier.name),
            ),
          catch: () => 0,
        }).pipe(Effect.catchAll(() => Effect.succeed(0)));
        ingestedCount += artifactIngested;
      }
    }

    // The cursor is deliberately compiled before its targeted dependencies are
    // loaded. Re-resolve it now that those tables are present; otherwise hover
    // retains the unresolved `property.Beds__c` chain and incorrectly falls
    // through to missing-artifact search. All downstream features consume this
    // parser-owned state; none reconstruct the receiver from document text.
    if (
      candidateNames.size > 0 &&
      (needsCrossFileResolution || ingestedCount > 0)
    ) {
      yield* Effect.promise(() =>
        materializeCursorCrossFileReferences(svc, uri, symbolTable),
      );
    }

    const telemetry = {
      candidateCount: candidateNames.size,
      localHitCount,
      requestedCount: missingNames.length,
      ingestedCount,
    };
    yield* Effect.annotateCurrentSpan({
      'cursor_target.candidate_count': telemetry.candidateCount,
      'cursor_target.local_hit_count': telemetry.localHitCount,
      'cursor_target.requested_count': telemetry.requestedCount,
      'cursor_target.ingested_count': telemetry.ingestedCount,
    });
    return telemetry;
  })().pipe(
    Effect.catchAll((error) =>
      Effect.sync(() => {
        getLogger().warn(
          () =>
            `[ENRICHMENT] Cursor-target dependency load failed for ${uri}: ${String(error)}`,
        );
        return {
          candidateCount: 0,
          localHitCount: 0,
          requestedCount: 0,
          ingestedCount: 0,
        };
      }),
    ),
  );
}

/**
 * Cross-worker symbol resolution fallback.
 *
 * When the enrichment worker's LOCAL name index ({@link findSymbolByName})
 * misses a referenced name, route a {@link DataOwnerQuerySymbolByName} query
 * through the assistance proxy to the data-owner — which holds ALL workspace
 * symbols — and ingest the owning file's symbol table so the reference can
 * resolve locally.
 *
 * Best-effort and idempotent: names already known locally are skipped, and a
 * failed query leaves the graph partial.
 *
 * @param svc Enrichment services (symbol manager + storage).
 * @param names Candidate names to resolve (e.g. unresolved class references).
 * @param queryByName Coordinator-assistance fetcher; injectable so the
 *   ingestion contract can be unit-tested without a live assistance bus.
 *   Defaults to {@link requestCoordinatorAssistancePromise}.
 * @param namespace Optional namespace/qualifier hint (e.g. the leading
 *   qualifier of a qualified TypeReference such as `MyNs` in `MyNs.Foo`).
 *   Threaded through to the {@link DataOwnerQuerySymbolByName} query so the
 *   data-owner can disambiguate same-named matches across namespaces. Omitted
 *   from the wire payload when absent so unqualified queries are byte-identical
 *   to before.
 * @returns Count of owning files ingested (0 on failure or no matches).
 */
export async function resolveMissingNamesViaDataOwner(
  svc: RequestServices,
  names: readonly string[],
  queryByName: (
    method: string,
    params: unknown,
    blocking: boolean,
  ) => Promise<unknown> = requestCoordinatorAssistancePromiseShared,
  namespace?: string,
): Promise<number> {
  // Drop duplicates and names the LOCAL name index already resolves before any
  // IPC. The local-skip also dedups against ResolveDepUris: any name it already
  // resolved is now in the local index, so it falls out here and is not
  // re-queried. The residual is exactly the set ResolveDepUris could not map.
  const residual: string[] = [];
  const seen = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) continue;
    seen.add(name);
    if (!(await hasCompleteLocalSymbolTable(svc, name))) residual.push(name);
  }

  if (residual.length === 0) return 0;

  const { SymbolTable } = await import('@salesforce/apex-lsp-parser-ast');
  try {
    // ONE blocking round-trip for the whole residual set. A file referencing N
    // unowned/managed-package types previously fired N sequential blocking hops
    // per keystroke; batching makes it a single hop. The success `entries` map
    // is keyed by owning file URI, so it carries every matched name's table.
    //
    // Thread the optional namespace/qualifier hint through to the data-owner
    // for same-name disambiguation. Only add the key when a namespace is
    // supplied so unqualified queries keep the exact prior payload shape.
    const queryParams: { names: string[]; namespace?: string } = {
      names: residual,
    };
    if (namespace) {
      queryParams.namespace = namespace;
    }
    const response = (await queryByName(
      'dataOwner:QuerySymbolByName',
      queryParams,
      true,
    )) as {
      matches?: ReadonlyArray<{ name: string; fileUri: string }>;
      entries?: Record<string, unknown>;
    };

    if (!response?.entries) return 0;
    let ingested = 0;
    for (const [fileUri, stData] of Object.entries(response.entries)) {
      if (!stData) continue;
      const st = SymbolTable.fromSerializedData(
        stData as SerializedSymbolTableData,
      );
      await Effect.runPromise(svc.symbolManager.addSymbolTable(st, fileUri));
      ingested++;
    }
    getLogger().debug(
      () =>
        `[ENRICHMENT] Cross-worker resolved ${residual.length} name(s) via ` +
        `data-owner: ${response.matches?.length ?? 0} match(es), ` +
        `${ingested} file(s) ingested`,
    );
    return ingested;
  } catch (err) {
    getLogger().debug(
      () =>
        '[ENRICHMENT] Cross-worker resolve failed for ' +
        `${residual.length} name(s): ${err}`,
    );
    return 0;
  }
}

/**
 * A name-only hit is not sufficient for cursor-target preparation. sObject
 * enrichment deliberately installs an incomplete placeholder first, then
 * replaces it with the composed describe table. Request-pool workers can retain
 * that placeholder after the data-owner has advanced, so treating it as a
 * cache hit permanently hides the object's fields from completion.
 */
async function hasCompleteLocalSymbolTable(
  svc: RequestServices,
  name: string,
): Promise<boolean> {
  const symbols = await svc.symbolManager.findSymbolByName(name);
  for (const symbol of symbols) {
    if (!symbol.fileUri) {
      return true;
    }
    const table = await svc.symbolManager.getSymbolTableForFile(symbol.fileUri);
    if (!table) {
      continue;
    }
    if (
      symbol.kind !== SymbolKind.SObject ||
      table.getMetadata().parseCompleteness !== 'incomplete'
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Load caller-side symbol tables needed by Find References into the local
 * enrichment worker's symbol manager.
 *
 * Where {@link loadSymbolDataForEnrichment} pre-fetches *outbound* deps (the
 * files this file references), Find References needs the *inbound* direction:
 * the files whose declared symbols reference the target. Those caller tables
 * must be present locally before `processReferences` runs so the reference
 * search sees cross-file usages, not just same-file ones.
 *
 * Best-effort: a failed resolve leaves the graph partial and the caller
 * proceeds with whatever tables are already loaded.
 *
 * @param svc Enrichment services (symbol manager + storage).
 * @param uri Target file URI whose dependents we want to load.
 * @param symbolName Optional narrowing to a single declared symbol's
 *   dependents; when omitted, dependents of any symbol declared in `uri`.
 * @param fetchDependents Coordinator-assistance fetcher; injectable so the
 *   ingestion contract can be unit-tested without a live assistance bus.
 *   Defaults to {@link requestCoordinatorAssistancePromise}.
 * @returns Count of dependent files ingested (0 on failure or no dependents).
 */
export async function loadDependentsForReferences(
  svc: RequestServices,
  uri: string,
  symbolName?: string,
  fetchDependents: (
    method: string,
    params: unknown,
    blocking: boolean,
  ) => Promise<unknown> = requestCoordinatorAssistancePromiseShared,
): Promise<number> {
  try {
    const response = (await fetchDependents(
      'dataOwner:ResolveDependentUris',
      { uri, symbolName },
      true,
    )) as { entries: Record<string, unknown> };

    if (!response?.entries) return 0;

    const { SymbolTable } = await import('@salesforce/apex-lsp-parser-ast');
    let ingested = 0;
    const ingestedUris: string[] = [];
    for (const [fileUri, stData] of Object.entries(response.entries)) {
      if (!stData) continue;
      const st = SymbolTable.fromSerializedData(
        stData as SerializedSymbolTableData,
      );
      await Effect.runPromise(svc.symbolManager.addSymbolTable(st, fileUri));
      ingested++;
      ingestedUris.push(fileUri);
    }

    // Resolve each freshly-loaded dependent's own cross-file references so its
    // OUTGOING edges — crucially the implements/extends supertype edges — land
    // in this worker's reverse index. find-implementation / find-references on a
    // supertype reads the reverse index of the TARGET (interface/superclass) for
    // its INCOMING edges; that edge is authored on the DEPENDENT (implementor/
    // subclass) side, so resolving the target file alone never materializes it.
    // The dependents were just ingested above, so their resolution targets are
    // present and this is bounded; resolveCrossFileReferencesForFile is
    // re-entrancy-guarded and addReference de-dupes, keeping it near-free on
    // repeat. (Replaces the former whole-workspace superClass/interfaces[] string
    // scan in ImplementationProcessingService, which masked this gap.)
    for (const fileUri of ingestedUris) {
      await Effect.runPromise(
        svc.symbolManager.resolveCrossFileReferencesForFile(fileUri),
      );
    }

    getLogger().debug(
      () =>
        `[REFERENCES] Loaded ${ingested} dependent table(s) for ${uri}` +
        (symbolName ? ` (symbol: ${symbolName})` : ''),
    );
    return ingested;
  } catch (err) {
    // Dependent pre-fetch is best-effort; reference search can still run on
    // the tables already loaded (e.g. same-file references). But reaching this
    // catch means cross-file callers were NOT loaded, so the result is likely
    // incomplete — warn so a "cross-file references missing" report has a
    // breadcrumb to follow.
    getLogger().warn(
      () => `[REFERENCES] Dependent pre-fetch failed for ${uri}: ${err}`,
    );
    return 0;
  }
}

/**
 * Recompile the cursor file at FULL detail into the worker's local symbol
 * manager, then resolve its cross-file references.
 *
 * Find References maps the cursor POSITION to a symbol via
 * getReferencesAtPosition / getSymbolAtPosition, which only see references that
 * live inside method bodies when the file was parsed at full detail. The
 * data-owner serves files at 'public-api' (bodies stripped), so a cursor on an
 * in-body usage (`RefUtil u = new RefUtil()`) resolves to nothing and Find
 * References returns []. documentSymbol hits the same wall and solves it by
 * recompiling the open file from its text with FullSymbolCollectorListener;
 * we do the same here so the cursor file carries its in-body references, then
 * resolve cross-file edges so usages in OTHER files still resolve to it.
 *
 * Best-effort: a missing/uncompilable document leaves the public-api graph in
 * place and Find References proceeds with whatever it has.
 *
 * @param svc Enrichment services (symbol manager).
 * @param uri Cursor file URI to recompile.
 * @param content Live document text; when absent, nothing is recompiled.
 */
export async function recompileCursorFileAtFullDetail(
  svc: RequestServices,
  uri: string,
  content?: string,
  options: {
    resolveCrossFileReferences?: boolean;
    reuseUnchangedContent?: boolean;
    sourceVersion?: number;
    telemetry?: {
      reused?: boolean;
      compileMs?: number;
      addSymbolTableMs?: number;
    };
  } = {},
): Promise<boolean> {
  // Only TRULY-ABSENT content (undefined) skips the recompile. An empty string
  // is a valid zero-length file — rejecting it with a `!content` falsy check
  // would leave a freshly-opened empty `.cls` at public-api detail and silently
  // return []. This mirrors the upstream `typeof req.content === 'string'` gate,
  // which already treats '' as "content present".
  if (content === undefined) return false;
  try {
    if (options.reuseUnchangedContent) {
      const cached = fullDetailCursorBySymbolManager
        .get(svc.symbolManager)
        ?.get(uri);
      const currentTable = await svc.symbolManager.getSymbolTableForFile(uri);
      if (
        cached?.content === content &&
        cached.sourceVersion === (options.sourceVersion ?? -1) &&
        cached.table === currentTable
      ) {
        if (options.telemetry) options.telemetry.reused = true;
        return true;
      }
    }
    // Authoritative-cursor-version guard: the live editor `content` IS the
    // latest text for this file at request time, but the pool worker may
    // already hold a table for `uri` tagged with a HIGHER documentVersion
    // (e.g. a prior didChange/write-back from the data owner). Tagging this
    // full-detail recompile with a lower `sourceVersion` makes
    // registerSymbolTable reject it as stale and keep the field-less
    // public-api table — the web-pool go-to-definition failure (W-23715603).
    // Lift the recompile version to at least the stored version so the full
    // table registers: a higher version replaces, an equal version merges
    // (which upgrades detail and preserves body symbols). Either way the
    // private field + its FIELD_ACCESS edge become canonical. Only the
    // registration version is lifted; the reuse cache above still keys on the
    // caller's requested version so content-identity reuse is unaffected.
    let effectiveSourceVersion = options.sourceVersion;
    if (effectiveSourceVersion !== undefined) {
      const existingTable = await svc.symbolManager.getSymbolTableForFile(uri);
      const storedVersion =
        typeof existingTable?.getMetadata === 'function'
          ? existingTable.getMetadata().documentVersion
          : undefined;
      if (
        storedVersion !== undefined &&
        storedVersion > effectiveSourceVersion
      ) {
        effectiveSourceVersion = storedVersion;
      }
    }
    const {
      CompilerService,
      FullSymbolCollectorListener,
      SymbolTable,
      ErrorType,
    } = await import('@salesforce/apex-lsp-parser-ast');
    const table = new SymbolTable();
    const listener = new FullSymbolCollectorListener(table);
    const compileStartedAt = performance.now();
    const result = new CompilerService().compile(content, uri, listener, {
      collectReferences: true,
      resolveReferences: true,
    });
    if (options.telemetry) {
      options.telemetry.compileMs = performance.now() - compileStartedAt;
    }
    const st = result?.result instanceof SymbolTable ? result.result : table;
    // Mark parse completeness HONESTLY before this full-detail table becomes
    // canonical and is written back to the data owner (W-23631128 review). A
    // malformed source still RECOVERS a table that reports getDetailLevel() ===
    // 'full', but a recovered parse can drop declarations in the damaged region.
    // If this table is trusted as complete, a correctness-sensitive data-owner
    // reader (CheckMemberConflicts) could approve a destructive rename against a
    // silently-truncated member set. Only SYNTAX errors indicate structural
    // incompleteness; benign SEMANTIC (unresolved cross-file) errors do not drop
    // declarations, so they must NOT poison completeness. This mirrors
    // ApexSymbolManager.enrichToLevel; the cursor recompile is the pool's only
    // full-detail producer, and writeBackEnrichedSymbols serializes this
    // metadata verbatim, so stamping here is what carries the signal to the owner.
    const syntaxErrorCount = (result?.errors ?? []).filter(
      (e) => e.type === ErrorType.Syntax,
    ).length;
    st.setMetadata({
      parseCompleteness: syntaxErrorCount > 0 ? 'incomplete' : 'complete',
      hasErrors: syntaxErrorCount > 0,
    });
    const addStartedAt = performance.now();
    await Effect.runPromise(
      svc.symbolManager.addSymbolTable(st, uri, effectiveSourceVersion),
    );
    if (options.telemetry) {
      options.telemetry.addSymbolTableMs = performance.now() - addStartedAt;
    }
    if (options.reuseUnchangedContent) {
      const currentTable = await svc.symbolManager.getSymbolTableForFile(uri);
      let entries = fullDetailCursorBySymbolManager.get(svc.symbolManager);
      if (!entries) {
        entries = new Map();
        fullDetailCursorBySymbolManager.set(svc.symbolManager, entries);
      }
      // Refresh insertion order for this URI, then cap retained source text.
      // The SymbolManager itself is worker-long-lived, so the inner map must
      // not grow with every document ever hovered during an editor session.
      entries.delete(uri);
      entries.set(uri, {
        content,
        sourceVersion: options.sourceVersion ?? -1,
        table: currentTable,
      });
      while (entries.size > MAX_FULL_DETAIL_CURSOR_CACHE_ENTRIES) {
        const oldestUri = entries.keys().next().value as string | undefined;
        if (oldestUri === undefined) break;
        entries.delete(oldestUri);
      }
    }
    // Re-resolve so the freshly-parsed in-body references re-key into the
    // cross-file reverse index (the public-api version's edges are superseded).
    if (options.resolveCrossFileReferences ?? true) {
      await Effect.runPromise(
        svc.symbolManager.resolveCrossFileReferencesForFile(uri),
      );
    }
    return true;
  } catch (err) {
    // The cursor file stays at public-api detail, so an in-body cursor won't
    // resolve and Find References can return []. Warn so that empty result is
    // attributable to a recompile failure rather than a genuine no-match.
    getLogger().warn(
      () => `[REFERENCES] Full-detail recompile failed for ${uri}: ${err}`,
    );
    return false;
  }
}

export interface PreparedLspRequestContext {
  readonly requestType: LSPRequestType;
  readonly uri: string;
  readonly documentVersion: number;
  readonly initialDetailLevel: DetailLevel;
  readonly achievedDetailLevel: DetailLevel;
  readonly cacheHit: boolean;
  readonly localTableChanged: boolean;
  readonly ready: boolean;
  readonly writeBackRequired: boolean;
  readonly policy: LspRequestPreparationPolicy;
}

const isLiveContentPolicy = (policy: LspRequestPreparationPolicy): boolean =>
  policy.content === 'live-if-available' || policy.content === 'live-required';

const shouldMaterializeWholeFile = (
  policy: LspRequestPreparationPolicy,
): boolean => policy.dependencyScope === 'outbound-file';

const asDetailLevel = (value: string): DetailLevel => {
  switch (value) {
    case 'public-api':
    case 'protected':
    case 'private':
    case 'full':
      return value;
    default:
      return 'public-api';
  }
};

/**
 * Prepare a cursor-oriented request using the authoritative request policy.
 * The returned achieved detail is based on work that actually completed; a
 * requested target level is never treated as proof of enrichment.
 */
export function prepareLspRequestCursor(
  svc: RequestServices,
  requestType: LSPRequestType,
  uri: string,
  content?: string,
  position?: { line: number; character: number },
  documentVersion?: number,
): Effect.Effect<PreparedLspRequestContext, never, never> {
  const policy = getLspRequestPreparationPolicy(requestType);
  return Effect.fn('worker.lspRequest.prepare', {
    attributes: { 'request.type': requestType, uri },
  })(function* () {
    const useCursorTargetDependencies =
      policy.dependencyScope === 'cursor-target' && position !== undefined;
    const loadTelemetry: {
      reusedLocalTables?: number;
      ingestedTables?: number;
      ownerQuerySkipped?: boolean;
      ownerMetadataOnly?: boolean;
    } = {};
    const loadResult = yield* loadSymbolDataForEnrichment(svc, uri, content, {
      materializeCrossFileReferences: shouldMaterializeWholeFile(policy),
      reuseCompiledCursor: policy.reuseUnchangedCursor,
      deferDependencyPrefetch: useCursorTargetDependencies,
      sourceVersion: documentVersion,
      allowOwnerQuerySkip: useCursorTargetDependencies,
      telemetry: loadTelemetry,
    });
    // Live editor content is authoritative for the request. The data owner can
    // still report the preceding version while the change compile is in
    // flight; tagging this recompile with that older version turns it into a
    // same-version merge and preserves declarations/references removed by the
    // edit. Install and write back the cursor table at the version that
    // supplied `content`, falling back to the owner version only for callers
    // that do not carry a document version.
    const cursorDocumentVersion = documentVersion ?? loadResult.version;
    const initialDetailLevel = asDetailLevel(loadResult.detailLevel);
    let achievedDetailLevel = asDetailLevel(
      loadResult.localDetailLevel ?? loadResult.detailLevel,
    );
    let cacheHit = false;
    let localTableChanged = false;

    const requiresDetailedCursor =
      policy.requiredDetailLevel === 'private' ||
      policy.requiredDetailLevel === 'full';
    if (
      requiresDetailedCursor &&
      isLiveContentPolicy(policy) &&
      content !== undefined
    ) {
      const recompileTelemetry: {
        reused?: boolean;
        compileMs?: number;
        addSymbolTableMs?: number;
      } = {};
      const recompiled = yield* Effect.promise(() =>
        recompileCursorFileAtFullDetail(svc, uri, content, {
          resolveCrossFileReferences: shouldMaterializeWholeFile(policy),
          reuseUnchangedContent: policy.reuseUnchangedCursor,
          sourceVersion: cursorDocumentVersion,
          telemetry: recompileTelemetry,
        }),
      );
      cacheHit = recompileTelemetry.reused === true;
      localTableChanged = recompiled && !cacheHit;
      // Honest readiness: `recompiled === true` only means the compile+register
      // call ran, NOT that the full table became canonical. addSymbolTable
      // silently drops a table rejected as stale, so trusting `recompiled`
      // alone reports ready against a field-less public-api table and returns a
      // wrong/empty definition (W-23715603). Confirm the canonical table for
      // the cursor file actually reached full detail before claiming it.
      if (recompiled) {
        // Read the detail level from the canonical table itself rather than
        // the manager's separate enrichment tracker (which addSymbolTable does
        // not update). getDetailLevel() derives the level from the symbols the
        // registered table actually holds, so a stale-rejected recompile
        // (canonical stays public-api) is reported honestly.
        const canonicalTable = yield* Effect.promise(() =>
          svc.symbolManager.getSymbolTableForFile(uri),
        );
        if (canonicalTable?.getDetailLevel() === 'full') {
          achievedDetailLevel = 'full';
        }
      }

      yield* Effect.annotateCurrentSpan({
        // `recompileCursorFileAtFullDetail` also returns true when an
        // unchanged local table is reused. Keep this attribute about actual
        // compilation so cache-hit traces are not contradictory.
        'request.cursor_recompiled': recompiled && !cacheHit,
        'request.cursor_cache_hit': cacheHit,
        'request.compile_ms': recompileTelemetry.compileMs ?? 0,
        'request.add_symbol_table_ms': recompileTelemetry.addSymbolTableMs ?? 0,
      });
    }

    const cursorTargetTelemetry = useCursorTargetDependencies
      ? yield* loadCursorTargetDependencies(svc, requestType, uri, position)
      : {
          candidateCount: 0,
          localHitCount: 0,
          requestedCount: 0,
          ingestedCount: 0,
        };

    const detailReady =
      policy.requiredDetailLevel === null ||
      !shouldEnrich(achievedDetailLevel, policy.requiredDetailLevel);
    const contentReady =
      policy.content !== 'live-required' || content !== undefined;
    const ready = detailReady && contentReady;
    const writeBackRequired =
      policy.writeBack &&
      ready &&
      shouldEnrich(initialDetailLevel, achievedDetailLevel);

    const stateSnapshot = symbolStateTracingEnabled()
      ? yield* Effect.tryPromise({
          try: () => captureSymbolStateTable(svc, uri, position),
          catch: (cause) => cause,
        }).pipe(
          Effect.tapError((error) =>
            Effect.logDebug(
              `[SYMBOL-STATE] Skipping prepared-request tracing: ${String(error)}`,
            ),
          ),
          Effect.catchAll(() => Effect.succeed(undefined)),
        )
      : undefined;
    const stateAnomaly =
      ready && content !== undefined && stateSnapshot?.symbols.length === 0
        ? 'prepared-request-has-no-cursor-symbol-table'
        : undefined;

    yield* Effect.annotateCurrentSpan({
      'request.content_available': content !== undefined,
      'request.initial_detail_level': initialDetailLevel,
      'request.achieved_detail_level': achievedDetailLevel,
      'request.dependency_scope': policy.dependencyScope,
      'request.failure_mode': policy.failureMode,
      'request.local_tables_reused': loadTelemetry.reusedLocalTables ?? 0,
      'request.tables_ingested': loadTelemetry.ingestedTables ?? 0,
      'request.owner_query_skipped': loadTelemetry.ownerQuerySkipped ?? false,
      'request.owner_metadata_only': loadTelemetry.ownerMetadataOnly ?? false,
      'request.cursor_target_candidate_count':
        cursorTargetTelemetry.candidateCount,
      'request.cursor_target_local_hit_count':
        cursorTargetTelemetry.localHitCount,
      'request.cursor_target_requested_count':
        cursorTargetTelemetry.requestedCount,
      'request.cursor_target_ingested_count':
        cursorTargetTelemetry.ingestedCount,
      'request.ready': ready,
      'request.write_back_required': writeBackRequired,
      ...symbolStateAttributes({
        phase: `request.prepare.${requestType}`,
        uri,
        workerId,
        workerRole: assignedRole ?? 'unassigned',
        documentVersion,
        ownerVersion: loadResult.version,
        tableVersion: stateSnapshot?.tableVersion,
        parseCompleteness: stateSnapshot?.parseCompleteness,
        content,
        detailLevel: stateSnapshot?.detailLevel ?? achievedDetailLevel,
        symbols: stateSnapshot?.symbols,
        references: stateSnapshot?.references,
        cursorReferences: stateSnapshot?.cursorReferences,
        cursorSymbols: stateSnapshot?.cursorSymbols,
        cursorPosition: stateSnapshot?.cursorPosition,
        outcome: ready ? 'ready' : 'not-ready',
        anomaly: stateAnomaly,
        extra: {
          'symbol_state.cursor_reference_count':
            stateSnapshot?.cursorReferences.length ?? 0,
          'symbol_state.cursor_cache_hit': cacheHit,
          'symbol_state.local_table_changed': localTableChanged,
        },
      }),
    });

    return {
      requestType,
      uri,
      documentVersion: cursorDocumentVersion,
      initialDetailLevel,
      achievedDetailLevel,
      cacheHit,
      localTableChanged,
      ready,
      writeBackRequired,
      policy,
    };
  })();
}

export function writeBackPreparedLspRequest(
  svc: RequestServices,
  prepared: PreparedLspRequestContext,
): Effect.Effect<boolean, never, never> {
  if (!prepared.writeBackRequired) return Effect.succeed(false);
  return writeBackEnrichedSymbols(
    svc,
    prepared.uri,
    prepared.documentVersion,
    prepared.achievedDetailLevel,
  );
}

/**
 * Load the symbol tables of every TYPE the cursor file references, regardless of
 * whether those references already carry a resolvedSymbolId.
 *
 * loadSymbolDataForEnrichment's Phase-2 prefetch only fetches types whose
 * references are UNRESOLVED (`!resolvedSymbolId`) — correct for hover/definition,
 * which follow the resolvedSymbolId to the data-owner on demand. But Find
 * References needs the referenced type's table PRESENT locally to enumerate that
 * type's own references: a `RefUtil` usage already resolved by the data-owner
 * still leaves RefUtil's table absent in the pool, so findReferencesTo(RefUtil)
 * sees nothing. This loads those already-resolved type tables too.
 *
 * Best-effort: failures leave the partial graph in place.
 *
 * @param svc Enrichment services (symbol manager).
 * @param uri Cursor file URI whose referenced types to load.
 */
export async function loadReferencedTypesForFile(
  svc: RequestServices,
  uri: string,
): Promise<number> {
  try {
    const { ReferenceContext } =
      await import('@salesforce/apex-lsp-parser-ast');
    const st = await svc.symbolManager.getSymbolTableForFile(uri);
    if (!st) return 0;
    const refs = st.getAllReferences();
    // Group the referenced type leaf names by their qualifier so the qualifier
    // can be threaded to the data-owner as a disambiguation namespace hint. A
    // qualified `MyNs.Foo` resolves by its LEAF (`Foo`) — the data-owner's name
    // index is keyed on the simple name — while the head (`MyNs`) is the
    // namespace hint. `declaringFileForCursorSymbol` strips to the same leaf.
    // The undefined-qualifier bucket is the unqualified hot path; it stays a
    // single batched, namespace-free query (byte-identical to before).
    const namesByQualifier = new Map<string | undefined, Set<string>>();
    for (const ref of refs) {
      if (
        ref.context === ReferenceContext.CLASS_REFERENCE ||
        ref.context === ReferenceContext.CONSTRUCTOR_CALL ||
        ref.context === ReferenceContext.TYPE_DECLARATION
      ) {
        const dot = ref.name.lastIndexOf('.');
        const leaf = dot >= 0 ? ref.name.slice(dot + 1) : ref.name;
        const qualifier = dot >= 0 ? ref.name.slice(0, dot) : undefined;
        const bucket = namesByQualifier.get(qualifier) ?? new Set<string>();
        bucket.add(leaf);
        namesByQualifier.set(qualifier, bucket);
      }
    }
    if (namesByQualifier.size === 0) return 0;
    // One batched query per distinct qualifier. In the common case a file's
    // type refs share a single bucket (unqualified, or one managed package), so
    // this is the same single round-trip as before; mixed qualifiers cost one
    // hop each rather than collapsing namespaces onto one ambiguous query.
    let ingested = 0;
    for (const [qualifier, leaves] of namesByQualifier) {
      ingested += await resolveMissingNamesViaDataOwner(
        svc,
        [...leaves],
        undefined,
        qualifier,
      );
    }
    // Bind the cursor file's references to the freshly-loaded type tables so the
    // reverse index + position-precise lookups resolve.
    await Effect.runPromise(
      svc.symbolManager.resolveCrossFileReferencesForFile(uri),
    );
    return ingested;
  } catch (err) {
    // Target type tables may be absent locally, so findReferencesTo(type) can
    // come back empty. Warn so the gap is attributable.
    getLogger().warn(
      () => `[REFERENCES] Referenced-type load failed for ${uri}: ${err}`,
    );
    return 0;
  }
}

type ParserPosition = { line: number; character: number };

type CursorReference = SymbolReference & {
  _originalChainedRef?: SymbolReference;
  _chainNode?: SymbolReference;
};

const positionInIdentifierRange = (
  position: ParserPosition,
  reference: SymbolReference,
): boolean => positionInRange(position, reference.location?.identifierRange);

const positionInRange = (
  position: ParserPosition,
  range:
    | {
        startLine: number;
        startColumn: number;
        endLine: number;
        endColumn: number;
      }
    | undefined,
): boolean => {
  if (!range) return false;
  if (position.line < range.startLine || position.line > range.endLine) {
    return false;
  }
  if (
    position.line === range.startLine &&
    position.character < range.startColumn
  ) {
    return false;
  }
  return !(
    position.line === range.endLine && position.character > range.endColumn
  );
};

const identifierRangeSize = (reference: SymbolReference): number => {
  const range = reference.location.identifierRange;
  return (
    (range.endLine - range.startLine) * 1_000_000 +
    range.endColumn -
    range.startColumn
  );
};

const referenceIdentity = (reference: SymbolReference): string =>
  [
    reference.name.toLowerCase(),
    String(reference.context),
    reference.resolvedSymbolId ?? '',
    reference.resolvedTypeId ?? '',
  ].join('\u001f');

/**
 * Select the parser reference whose own identifier token contains the cursor.
 * `getReferencesAtPosition` also returns enclosing chain references and
 * synthetic chain nodes, so array order is not semantic. A resolved identity
 * wins over unresolved duplicates at the same narrowest range. Conflicting
 * identities remain ambiguous rather than selecting whichever was inserted
 * first.
 */
function exactCursorReference(
  references: readonly SymbolReference[],
  position: ParserPosition,
): { reference: CursorReference | null; ambiguous: boolean } {
  const exact = references.filter((reference) =>
    positionInIdentifierRange(position, reference),
  );
  if (exact.length === 0) return { reference: null, ambiguous: false };

  const smallest = Math.min(...exact.map(identifierRangeSize));
  const narrowest = exact.filter(
    (reference) => identifierRangeSize(reference) === smallest,
  ) as CursorReference[];
  const resolvedIds = new Set(
    narrowest
      .map((reference) => reference.resolvedSymbolId)
      .filter((id): id is string => Boolean(id)),
  );
  if (resolvedIds.size > 1) return { reference: null, ambiguous: true };
  if (resolvedIds.size === 1) {
    const resolvedId = [...resolvedIds][0];
    return {
      reference:
        narrowest.find(
          (reference) => reference.resolvedSymbolId === resolvedId,
        ) ?? null,
      ambiguous: false,
    };
  }

  const identities = new Set(narrowest.map(referenceIdentity));
  if (identities.size > 1) return { reference: null, ambiguous: true };
  return { reference: narrowest[0] ?? null, ambiguous: false };
}

const namespaceText = (symbol: ApexSymbol): string => {
  if (typeof symbol.namespace === 'string') return symbol.namespace;
  return symbol.namespace?.toString?.() ?? '';
};

const referenceOwnerIds = (reference: CursorReference): Set<string> => {
  const ownerIds = new Set<string>();
  const chain = reference._originalChainedRef?.chainNodes;
  if (!chain?.length) return ownerIds;

  const selected = reference._chainNode ?? reference;
  const selectedRange = selected.location.identifierRange;
  const index = chain.findIndex((node) => {
    const range = node.location.identifierRange;
    return (
      node.name.toLowerCase() === selected.name.toLowerCase() &&
      range.startLine === selectedRange.startLine &&
      range.startColumn === selectedRange.startColumn &&
      range.endLine === selectedRange.endLine &&
      range.endColumn === selectedRange.endColumn
    );
  });
  if (index <= 0) return ownerIds;
  const receiver = chain[index - 1];
  if (receiver.resolvedTypeId) ownerIds.add(receiver.resolvedTypeId);
  if (receiver.resolvedSymbolId) ownerIds.add(receiver.resolvedSymbolId);
  return ownerIds;
};

async function resolveReferenceSymbol(
  svc: RequestServices,
  reference: CursorReference,
): Promise<ApexSymbol | null> {
  if (reference.resolvedSymbolId) {
    const resolved = await svc.symbolManager.getSymbol(
      reference.resolvedSymbolId,
    );
    if (resolved) return resolved;
  }

  const qualifiedName = reference.name.includes('.')
    ? reference.name
    : undefined;
  if (qualifiedName) {
    const exactFqn = await svc.symbolManager.findSymbolByFQN(qualifiedName);
    if (exactFqn) return exactFqn;
  }

  const leaf = reference.name.includes('.')
    ? reference.name.slice(reference.name.lastIndexOf('.') + 1)
    : reference.name;
  let candidates = await svc.symbolManager.findSymbolByName(leaf);

  if (qualifiedName) {
    const qualifier = qualifiedName.slice(0, qualifiedName.lastIndexOf('.'));
    candidates = candidates.filter(
      (candidate) =>
        candidate.fqn?.toLowerCase() === qualifiedName.toLowerCase() ||
        namespaceText(candidate).toLowerCase() === qualifier.toLowerCase(),
    );
  }

  const ownerIds = referenceOwnerIds(reference);
  if (ownerIds.size > 0) {
    candidates = candidates.filter(
      (candidate) => candidate.parentId && ownerIds.has(candidate.parentId),
    );
  }

  return candidates.length === 1 ? candidates[0] : null;
}

/** Resolve a declaration or the exact parser reference under the cursor. */
async function resolveCursorSymbol(
  svc: RequestServices,
  uri: string,
  position: ParserPosition,
): Promise<ApexSymbol | null> {
  const references = await svc.symbolManager.getReferencesAtPosition(
    uri,
    position,
  );
  const selected = exactCursorReference(references ?? [], position);
  if (selected.ambiguous) return null;
  if (selected.reference) {
    const resolved = await resolveReferenceSymbol(svc, selected.reference);
    if (resolved) return resolved;

    // Some declaration tokens also carry a parser reference. Accept the
    // precise result only when its declaration range is the cursor token in
    // this file; a usage resolves to a declaration elsewhere (or at another
    // range) and therefore cannot reintroduce the old order-dependent fallback.
    const declaration = await svc.symbolManager.getSymbolAtPosition(
      uri,
      position,
      'precise',
    );
    if (
      declaration?.fileUri === uri &&
      positionInRange(position, declaration.location?.identifierRange)
    ) {
      return declaration;
    }
    return null;
  }

  return svc.symbolManager.getSymbolAtPosition(uri, position, 'precise');
}

/**
 * Resolve the symbol under the cursor and return the file URI it is DECLARED
 * in. Find References on a usage must load callers of the TARGET symbol, which
 * may live in a different file than the cursor (e.g. the cursor is on a
 * `RefUtil` usage in CallerA, but the references span CallerB too). The target's
 * dependents hang off its declaring file, so the handler loads dependents for
 * THIS uri rather than the cursor file.
 *
 * Requires the cursor file to already be compiled at full detail locally (so
 * the position resolves). Returns null when no symbol resolves or it carries no
 * fileUri, in which case the caller falls back to the cursor file.
 */
export async function declaringFileForCursorSymbol(
  svc: RequestServices,
  uri: string,
  position: { line: number; character: number },
): Promise<string | null> {
  try {
    // LSP (0-based line) → parser (1-based line, 0-based column).
    const parserPosition = {
      line: position.line + 1,
      character: position.character,
    };

    const symbol = await resolveCursorSymbol(svc, uri, parserPosition);
    const fileUri = (symbol as { fileUri?: string } | null)?.fileUri;
    return fileUri && fileUri !== uri ? fileUri : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Lazy role-specific service containers (bootstrapped on first dispatch)
// ---------------------------------------------------------------------------

/**
 * Get numeric order index for detail levels.
 * Matches LayerEnrichmentService's ordering.
 */
export function getLayerOrderIndex(
  level: 'public-api' | 'protected' | 'private' | 'full',
): number {
  const order: Record<string, number> = {
    'public-api': 1,
    protected: 2,
    private: 3,
    full: 4,
  };
  return order[level] || 0;
}

export const ensureDataOwnerServices: Effect.Effect<DataOwnerServices> =
  Effect.runSync(
    Effect.cached(
      Effect.gen(function* () {
        const { bootstrapDataOwnerServices } = yield* Effect.promise(
          () => import('@salesforce/apex-lsp-compliant-services'),
        );
        const resourceLoaderLayer = (yield* Effect.promise(() =>
          _makeResourceLoaderRemoteLayer(),
        )) as import('effect').Layer.Layer<
          import('@salesforce/apex-lsp-parser-ast').ResourceLoaderService
        >;
        const svc = yield* Effect.promise(() =>
          bootstrapDataOwnerServices(resourceLoaderLayer),
        );
        yield* Effect.logInfo('[DATA-OWNER] services bootstrapped');
        return svc;
      }),
    ),
  );

export const ensureRequestServices: Effect.Effect<RequestServices> =
  Effect.runSync(
    Effect.cached(
      Effect.gen(function* () {
        const {
          bootstrapRequestServices,
          EnhancedMissingArtifactResolutionService,
        } = yield* Effect.promise(
          () => import('@salesforce/apex-lsp-compliant-services'),
        );
        const resourceLoaderLayer = (yield* Effect.promise(() =>
          _makeResourceLoaderRemoteLayer(),
        )) as import('effect').Layer.Layer<
          import('@salesforce/apex-lsp-parser-ast').ResourceLoaderService
        >;
        const svc = yield* Effect.promise(() =>
          bootstrapRequestServices(resourceLoaderLayer),
        );

        // Wire coordinator assistance so the enrichment worker can forward
        // apex/findMissingArtifact to the coordinator (which holds the LSP
        // client connection) rather than silently dropping the request.
        //
        // blocking=true: the coordinator mediator must await its handler (drive
        // the client to open the artifact, which flows to the data-owner via
        // didOpen) and return the real FindMissingArtifactResult. With
        // blocking=false it returns {accepted:true} immediately, which the
        // blocking-resolution caller mis-reads as "resolved" before the artifact
        // loads. The background caller doesn't await, so blocking=true is
        // harmless there.
        EnhancedMissingArtifactResolutionService.setAssistanceProxy((params) =>
          requestCoordinatorAssistancePromiseShared(
            'apex/findMissingArtifact',
            params,
            true,
          ),
        );

        yield* Effect.logInfo('[ENRICHMENT] services bootstrapped');
        return svc;
      }),
    ),
  );

// ---------------------------------------------------------------------------
// Role-specific initialization
// ---------------------------------------------------------------------------

export const handleWorkerInitRole = (
  req: Schema.Schema.Type<typeof WorkerInit>,
): Effect.Effect<{ ready: boolean }, never, CompilationWorkerPoolService> => {
  if (req.role === 'resourceLoader') {
    return Effect.gen(function* () {
      const { ResourceLoader } = yield* Effect.promise(
        () => import('@salesforce/apex-lsp-parser-ast'),
      );
      yield* Effect.promise(() => ResourceLoader.getInstance().initialize());
      yield* Effect.logInfo('[resource-loader] stdlib loaded');
      return { ready: true };
    });
  }
  if (req.role === 'dataOwner') {
    return Effect.gen(function* () {
      yield* ensureDataOwnerServices;
      const compilationPool = yield* CompilationWorkerPool;
      if (compilationPool.available) {
        yield* Effect.logInfo(
          `[DATA-OWNER] compilation pool ready (size=${compilationPool.size}, ` +
            `concurrencyPerWorker=${compilationPool.concurrency})`,
        );
      } else {
        // Some focused worker topologies do not install workspace-compilation
        // infrastructure. They may still serve ordinary data-owner requests;
        // WorkspaceBatchCompileOnDataOwner fails explicitly if invoked.
        yield* Effect.logDebug(
          '[DATA-OWNER] workspace compilation capability is not installed',
        );
      }
      return { ready: true };
    });
  }
  if (req.role === 'lspRequest') {
    return Effect.gen(function* () {
      yield* ensureRequestServices;
      return { ready: true };
    });
  }
  return Effect.succeed({ ready: true });
};

// ---------------------------------------------------------------------------
// Enrichment write-back gating & write-back (Step 5)
// ---------------------------------------------------------------------------

/**
 * Determine if enrichment is needed based on current and required detail levels.
 * Uses the same ordering as LayerEnrichmentService on origin/main.
 */
export function shouldEnrich(
  currentLevel: string,
  requiredLevel: 'public-api' | 'protected' | 'private' | 'full',
): boolean {
  const levelOrder: Record<string, number> = {
    'public-api': 1,
    protected: 2,
    private: 3,
    full: 4,
  };

  const currentOrder = levelOrder[currentLevel] || 0;
  const requiredOrder = levelOrder[requiredLevel] || 0;

  return requiredOrder > currentOrder;
}

/**
 * Write back enriched symbol data to the data-owner worker.
 * Returns true if the write-back was accepted, false otherwise.
 */
export function writeBackEnrichedSymbols(
  svc: RequestServices,
  uri: string,
  documentVersion: number,
  enrichedDetailLevel: 'public-api' | 'protected' | 'private' | 'full',
): Effect.Effect<boolean, never, never> {
  const startTime = Date.now();
  return Effect.gen(function* () {
    const symbolTable = yield* Effect.tryPromise({
      try: () => svc.symbolManager.getSymbolTableForFile(uri),
      catch: (cause) => cause,
    });
    if (!symbolTable) {
      yield* Effect.logDebug(
        `[ENRICHMENT] Write-back skipped: no symbol table for ${uri}`,
      );
      return false;
    }

    const actualDetailLevel = symbolTable.getDetailLevel();
    if (
      actualDetailLevel === null ||
      shouldEnrich(actualDetailLevel, enrichedDetailLevel)
    ) {
      yield* Effect.logWarning(
        `[ENRICHMENT] Write-back skipped: table for ${uri} reached ` +
          `${actualDetailLevel ?? 'unknown'}, below claimed ${enrichedDetailLevel}`,
      );
      return false;
    }

    // Serialize symbol table to wire format with instrumentation
    const { enrichedSymbolTable, serializeMs, payloadSizeBytes } =
      yield* Effect.fn('worker.enrichment.serializeSymbols', {
        attributes: { uri },
      })(function* () {
        const serializeStart = Date.now();
        const table = cloneForWire({
          symbols: symbolTable.getAllSymbols(),
          references: symbolTable.getAllReferences(),
          hierarchicalReferences: symbolTable.getAllHierarchicalReferences(),
          metadata: symbolTable.getMetadata(),
          fileUri: symbolTable.getFileUri(),
        });
        const serializeMs = Date.now() - serializeStart;

        // Estimate payload size (approximate via JSON serialization)
        const payloadSizeBytes = JSON.stringify(table).length;

        return yield* Effect.succeed({
          enrichedSymbolTable: table,
          serializeMs,
          payloadSizeBytes,
        });
      })();

    const symbolCount = Array.isArray(enrichedSymbolTable?.symbols)
      ? enrichedSymbolTable.symbols.length
      : 0;
    const referenceCount = Array.isArray(enrichedSymbolTable?.references)
      ? enrichedSymbolTable.references.length
      : 0;

    const response = (yield* Effect.fn('worker.enrichment.updateSymbolSubset', {
      attributes: {
        uri,
        symbolCount,
        referenceCount,
        detailLevel: actualDetailLevel,
        payloadSizeBytes,
        serializeMs,
      },
    })(function* () {
      const ipcCallStart = Date.now();
      const result = (yield* Effect.tryPromise({
        try: () =>
          requestCoordinatorAssistancePromiseShared(
            'dataOwner:UpdateSymbolSubset',
            {
              uri,
              documentVersion,
              enrichedSymbolTable,
              enrichedDetailLevel: actualDetailLevel,
              sourceWorkerId: workerId,
            },
            true,
          ),
        catch: (cause) => cause,
      })) as { accepted: boolean; merged: number; versionMismatch: boolean };

      const ipcCallMs = Date.now() - ipcCallStart;

      // Track post-IPC cleanup/overhead
      yield* Effect.fn('worker.enrichment.postIpcCleanup', {
        attributes: { uri, ipcCallMs },
      })(function* () {
        // Explicit cleanup marker - any work here contributes to post-IPC gap
        return yield* Effect.succeed(undefined);
      })();

      return result;
    })()) as { accepted: boolean; merged: number; versionMismatch: boolean };

    const elapsed = Date.now() - startTime;
    const accepted = response?.accepted ?? false;

    yield* Effect.logDebug(
      `[ENRICHMENT] Write-back ${accepted ? 'accepted' : 'rejected'}: ` +
        `${symbolCount} symbols, ${actualDetailLevel} level, ${uri} ` +
        `(v${documentVersion}, ${elapsed}ms)` +
        (response?.versionMismatch ? ' [version mismatch]' : ''),
    );

    return accepted;
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        const elapsed = Date.now() - startTime;
        yield* Effect.logWarning(
          `[ENRICHMENT] Write-back failed: ${uri} (${elapsed}ms) - ${String(error)}`,
        );
        return false;
      }),
    ),
  );
}

// ---------------------------------------------------------------------------
// Helper: Worker log emission (delegates to shared logger)
// ---------------------------------------------------------------------------

function emitWorkerLog(level: string, message: string): void {
  const logger = getLogger();
  switch (level) {
    case 'debug':
      logger.debug(() => message);
      break;
    case 'info':
      logger.info(() => message);
      break;
    case 'warn':
    case 'warning':
      logger.warn(() => message);
      break;
    case 'error':
      logger.error(() => message);
      break;
  }
}

// ---------------------------------------------------------------------------
// Find-references helpers (W-23272674)
// ---------------------------------------------------------------------------

/**
 * Identifier coordinates in parser space (1-based line, 0-based column).
 */
export type OccurrenceRange = {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
};

/**
 * A single occurrence of a symbol: the file URI plus the matched identifier's
 * range (parser coordinates). Shared by find-references and rename.
 */
export type CursorOccurrence = {
  uri: string;
  identifierRange: OccurrenceRange;
};

/**
 * Phase-2 of find-references (W-23272674, standalone-scan pivot): given the
 * candidate files surfaced by the phase-1 lexical prefilter, parse EACH ONE at
 * full detail into its OWN throwaway SymbolTable and scan that table for
 * genuine code references to the target — WITHOUT ingesting anything into the
 * shared ApexSymbolManager.
 *
 * This replaces the former shared-graph approach (recompile each candidate via
 * `addSymbolTable`, then read the reverse index). That path was proven
 * infeasible: `addSymbolTable`'s cost scales with total loaded graph size, so a
 * single small candidate cost ~8s against a loaded workspace and blew the
 * request timeout. A standalone parse+scan is ~40x faster (parse ~160ms + scan
 * ~1ms per file) and, because comments and string literals never parse as
 * references, inherently rejects the false positives that make the IDE's native
 * text search noisy. See memory project-findreferences-standalone-pivot.
 *
 * @returns Flat list of occurrence matches across all candidates (parser
 *   coordinates: 1-based line, 0-based column).
 */
export async function scanCandidatesForOccurrences(
  candidates: Array<{ uri: string; content: string }>,
  target: { name: string; kind?: string },
): Promise<CursorOccurrence[]> {
  const {
    CompilerService,
    FullSymbolCollectorListener,
    SymbolTable,
    findOccurrencesInFile,
  } = await import('@salesforce/apex-lsp-parser-ast');

  const out: CursorOccurrence[] = [];

  // De-dupe candidate URIs so a file mentioned twice is scanned once.
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (seen.has(candidate.uri)) continue;
    seen.add(candidate.uri);
    try {
      const table = new SymbolTable();
      const listener = new FullSymbolCollectorListener(table);
      const result = new CompilerService().compile(
        candidate.content,
        candidate.uri,
        listener,
        { collectReferences: true, resolveReferences: true },
      );
      const st = result?.result instanceof SymbolTable ? result.result : table;
      const matches = findOccurrencesInFile(st, candidate.uri, target);
      for (const m of matches) {
        out.push({ uri: m.uri, identifierRange: m.identifierRange });
      }
    } catch (err) {
      // A candidate that fails to parse contributes no matches rather than
      // failing the whole request; the others still resolve.
      getLogger().warn(
        () => `[REFERENCES] phase2 scan failed for ${candidate.uri}: ${err}`,
      );
    }
  }
  return out;
}

/**
 * Resolve the target symbol under the cursor to its NAME and kind, for the
 * workspace-wide find-references rebuild. Only name+kind are needed here — no
 * declaring-file lookup, type prefetch, or dependent loading (phase-2 does the
 * symbolic match). The cursor is resolved from its exact parser reference and
 * semantic identity; ambiguous name-only matches produce no target.
 *
 * The cursor file must already be compiled at full detail (so in-body usages
 * resolve) before this runs.
 */
export async function targetSymbolForCursor(
  svc: RequestServices,
  uri: string,
  position: { line: number; character: number },
): Promise<{ name: string; kind?: string } | null> {
  try {
    // LSP (0-based line) → parser (1-based line, 0-based column).
    const parserPosition = {
      line: position.line + 1,
      character: position.character,
    };

    const symbol = await resolveCursorSymbol(svc, uri, parserPosition);
    if (symbol?.name) {
      return {
        name: symbol.name,
        kind: typeof symbol.kind === 'string' ? symbol.kind : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * A declaration's file URI and identifier range (parser coordinates: 1-based
 * line, 0-based column), as returned by {@link declarationLocationForCursor}.
 */
type DeclarationLocation = {
  uri: string;
  identifierRange: OccurrenceRange;
};

/**
 * Resolve the DECLARATION location of the symbol under the cursor, for
 * find-references with `includeDeclaration`. Uses the same precise
 * position→symbol resolution as {@link targetSymbolForCursor}; when the cursor
 * is on a usage rather than the declaration, resolves the usage's reference to
 * its declaring symbol by name. Returns the declaration's identifier range in
 * parser coordinates (1-based line, 0-based column), or null when it can't be
 * determined (the caller then simply omits the declaration).
 */
export async function declarationLocationForCursor(
  svc: RequestServices,
  uri: string,
  position: { line: number; character: number },
): Promise<DeclarationLocation | null> {
  try {
    const parserPosition = {
      line: position.line + 1,
      character: position.character,
    };

    const asDecl = (sym: unknown): DeclarationLocation | null => {
      const s = sym as {
        fileUri?: string;
        location?: { identifierRange?: DeclarationLocation['identifierRange'] };
      } | null;
      const ir = s?.location?.identifierRange;
      if (!s?.fileUri || !ir) return null;
      return { uri: s.fileUri, identifierRange: ir };
    };

    // The exact parser reference resolves to its declaration; a cursor with no
    // reference can still be directly on a declaration symbol.
    const precise = await resolveCursorSymbol(svc, uri, parserPosition);
    const fromPrecise = asDecl(precise);
    if (fromPrecise) return fromPrecise;
    return null;
  } catch {
    return null;
  }
}

/**
 * The resolved target symbol plus every occurrence of it across the workspace,
 * as produced by {@link resolveOccurrencesForCursor}. `null` occurrences here
 * never happen — the helper returns the whole struct as `null` instead — but
 * the shape keeps target + occurrences together for the caller.
 */
export type CursorOccurrenceResolution = {
  target: { name: string; kind?: string };
  occurrences: CursorOccurrence[];
};

/**
 * Shared cursor→occurrences core for the workspace-wide two-phase scan
 * (W-23272674), reused by find-references and rename (W-23631073). Runs the
 * kind-agnostic stages that both features need, in order:
 *
 *   1. recompile the cursor file at full detail (so in-body usages resolve),
 *      aborting when there's no text to compile;
 *   2. resolve the cursor position → target symbol name + kind
 *      ({@link targetSymbolForCursor});
 *   3. phase-1 lexical prefilter of the workspace via the data-owner
 *      (`FindOccurrenceCandidates`), overriding the cursor file's candidate
 *      content with the live editor buffer for fidelity;
 *   4. phase-2 standalone parse + reference scan over each candidate
 *      ({@link scanCandidatesForOccurrences}).
 *
 * Returns the target + its occurrences, or `null` when the cursor can't be
 * resolved (no text / no target). Result assembly is deliberately left to the
 * caller: find-references maps occurrences to an LSP `Location[]` (and adds the
 * declaration when `includeDeclaration` is set); rename builds a
 * `WorkspaceEdit`. Neither the declaration lookup nor `includeDeclaration`
 * lives here — they are references-specific.
 */
export async function resolveOccurrencesForCursor(
  svc: RequestServices,
  req: PositionReq,
  logPrefix = 'OCCURRENCES',
): Promise<CursorOccurrenceResolution | null> {
  // --- Stage 1: recompile the cursor file at full detail.
  const cursorTextAvailable = typeof req.content === 'string';
  const cursorRecompiled = await recompileCursorFileAtFullDetail(
    svc,
    req.textDocument.uri,
    req.content,
    // The request worker does not yet own the cursor file's referenced type
    // tables. Resolve those dependencies explicitly below before binding the
    // cursor reference.
    { resolveCrossFileReferences: false },
  );

  // With no document text the cursor file stays at public-api detail and the
  // position→symbol lookup cannot succeed; abort rather than mislead.
  if (!cursorRecompiled && !cursorTextAvailable) {
    getLogger().warn(
      () =>
        `[${logPrefix}] No document text for ${req.textDocument.uri}; ` +
        'cursor file cannot be recompiled at full detail, so position ' +
        'resolution cannot succeed. Aborting with no result.',
    );
    return null;
  }

  // Precise target selection must follow resolved parser identity. The
  // full-detail cursor table identifies its parser-declared type dependencies;
  // ingest those type tables and materialize the cursor file's cross-file
  // edges before resolving the symbol at the cursor. If loading fails, target
  // selection preserves uncertainty and returns no result rather than guessing
  // by name.
  await loadReferencedTypesForFile(svc, req.textDocument.uri);

  // --- Stage 2: resolve the target symbol under the cursor.
  const target = await targetSymbolForCursor(
    svc,
    req.textDocument.uri,
    req.position,
  );
  emitWorkerLog(
    'info',
    `[${logPrefix}] target: name=${target?.name ?? '<none>'} ` +
      `kind=${target?.kind ?? '<none>'}`,
  );
  if (!target?.name) return null;

  // --- Stage 3: phase-1 lexical prefilter of the workspace.
  const scan = (await requestCoordinatorAssistancePromiseShared(
    'dataOwner:FindOccurrenceCandidates',
    { symbolName: target.name },
    true,
  )) as { candidates: Array<{ uri: string; content: string }> };
  const rawCandidates = scan?.candidates ?? [];

  // Live-buffer fidelity for the file under the cursor: phase-1 and phase-2
  // both scan the data-owner's STORED content, which can lag the unsaved editor
  // buffer. `req.content` is the live text for the cursor file, so override
  // that one candidate's content with it (matched by URI). Other files keep
  // their stored content. Safe for phase-2, which parses each candidate's
  // `content` standalone (see scanCandidatesForOccurrences).
  const candidates =
    typeof req.content === 'string'
      ? rawCandidates.map((c) =>
          c.uri === req.textDocument.uri
            ? { ...c, content: req.content as string }
            : c,
        )
      : rawCandidates;
  emitWorkerLog('info', `[${logPrefix}] candidates: ${candidates.length}`);

  // --- Stage 4: phase-2 standalone parse + reference scan.
  const occurrences = await scanCandidatesForOccurrences(candidates, target);
  emitWorkerLog(
    'info',
    `[${logPrefix}] phase2: ${occurrences.length} occurrence(s) across ` +
      `${candidates.length} candidate(s)`,
  );

  return { target: { name: target.name, kind: target.kind }, occurrences };
}

async function captureResolutionStateAttributes(
  svc: RequestServices,
  requestType: 'hover' | 'completion' | 'definition',
  req: PositionReq,
  prepared: PreparedLspRequestContext,
  result: unknown,
): Promise<SymbolStateSpanAttributes> {
  if (!symbolStateTracingEnabled()) return {};
  const uri = req.textDocument.uri;
  const snapshot = await captureSymbolStateTable(svc, uri, req.position);
  const resultMissing =
    result == null ||
    (Array.isArray(result) && result.length === 0) ||
    (typeof result === 'object' &&
      result !== null &&
      'items' in result &&
      Array.isArray((result as { items?: unknown[] }).items) &&
      (result as { items: unknown[] }).items.length === 0);
  const searchingFallback = isSearchingHover(result);
  const unresolvedCursor =
    snapshot.cursorReferences.length > 0 &&
    snapshot.cursorReferences.every((reference) => !reference.resolvedSymbolId);
  const selectedReference = selectSymbolStateReference(
    snapshot.cursorReferences,
    snapshot.cursorPosition,
  );
  const selectedReferenceAttributes: SymbolStateSpanAttributes = {
    ...(selectedReference?.name
      ? { 'symbol_state.selected_reference_name': selectedReference.name }
      : {}),
    ...(selectedReference?.context !== undefined
      ? {
          'symbol_state.selected_reference_context': String(
            selectedReference.context,
          ),
        }
      : {}),
    ...(selectedReference?.resolvedSymbolId
      ? {
          'symbol_state.selected_symbol_id': selectedReference.resolvedSymbolId,
        }
      : {}),
  };
  const anomaly = searchingFallback
    ? `${requestType}-returned-searching-fallback`
    : resultMissing && snapshot.cursorReferences.length > 0
      ? `${requestType}-returned-empty-with-cursor-reference`
      : undefined;
  const itemCount =
    typeof result === 'object' &&
    result !== null &&
    'items' in result &&
    Array.isArray((result as { items?: unknown[] }).items)
      ? (result as { items: unknown[] }).items.length
      : Array.isArray(result)
        ? result.length
        : result == null
          ? 0
          : 1;
  return symbolStateAttributes({
    phase: `request.resolve.${requestType}`,
    uri,
    workerId,
    workerRole: assignedRole ?? 'unassigned',
    documentVersion: req.documentVersion,
    ownerVersion: prepared.documentVersion,
    tableVersion: snapshot.tableVersion,
    parseCompleteness: snapshot.parseCompleteness,
    content: req.content,
    detailLevel: snapshot.detailLevel,
    symbols: snapshot.symbols,
    references: snapshot.references,
    cursorReferences: snapshot.cursorReferences,
    cursorSymbols: snapshot.cursorSymbols,
    cursorPosition: snapshot.cursorPosition,
    outcome: searchingFallback
      ? 'searching-fallback'
      : resultMissing
        ? 'empty'
        : 'resolved',
    anomaly,
    extra: {
      'symbol_state.cursor_reference_count': snapshot.cursorReferences.length,
      'symbol_state.cursor_references_unresolved': unresolvedCursor,
      'symbol_state.result_count': itemCount,
      ...selectedReferenceAttributes,
    },
  });
}

function safelyCaptureResolutionStateAttributes(
  svc: RequestServices,
  requestType: 'hover' | 'completion' | 'definition',
  req: PositionReq,
  prepared: PreparedLspRequestContext,
  result: unknown,
): Effect.Effect<SymbolStateSpanAttributes> {
  return Effect.tryPromise({
    try: () =>
      captureResolutionStateAttributes(svc, requestType, req, prepared, result),
    catch: (cause) => cause,
  }).pipe(
    Effect.tapError((error) =>
      Effect.logDebug(
        `[SYMBOL-STATE] Skipping ${requestType} tracing: ${String(error)}`,
      ),
    ),
    Effect.catchAll(() => Effect.succeed({})),
  );
}

// ---------------------------------------------------------------------------
// renameLocal (W-23631077, W-23631080)
// ---------------------------------------------------------------------------

/**
 * The rename result is a standard LSP `WorkspaceEdit` (re-exported by
 * `vscode-languageserver`, the protocol type `RenameProcessingService` uses).
 * renameLocal only ever touches one file — a local's declaration and usages are
 * all in the same file — so `changes` has a single key, but the shape
 * generalizes to the cross-file kinds later. Type-only import: erased at
 * compile time, so no worker-bundle weight is added.
 */
type WorkspaceEditResult = WorkspaceEdit;

/**
 * Error result shape for rename validation failures (W-23631080). The worker
 * returns this when the newName is invalid, and the LCSAdapter handler converts
 * it to an LSP ResponseError.
 */
type RenameErrorResult = {
  error: {
    code: number;
    message: string;
  };
};

/**
 * Check whether a local can be renamed (W-23631080 guard).
 *
 * For locals (variables/parameters) this is ALWAYS true — a local from a
 * standalone parse of the user's open file is always user-sourced, never stdlib.
 * The guard exists for extension by later rename groups (fields/methods/types),
 * which CAN resolve into the standard library (e.g. `String.valueOf`) and must
 * reject rename attempts on those (check whether the declaration's fileUri falls
 * under `STANDARD_APEX_LIBRARY_URI`).
 *
 * @param declaration The local's declaring symbol.
 * @returns `true` for locals; extension-ready for the stdlib-aware later groups.
 */
function canBeRenamed(_declaration: ApexSymbol): boolean {
  // For locals, always true. Later groups: check
  // `declaration.location?.uri.startsWith(STANDARD_APEX_LIBRARY_URI)` → false.
  return true;
}

/**
 * Build a rename `WorkspaceEdit` for a LOCAL variable or parameter under the
 * cursor (W-23631077, W-23631080). Unlike find-references / renameField, a local
 * is single-file and lexically scoped, so this does NOT run the workspace-wide
 * two-phase scan (which would surface same-named locals in OTHER files). It
 * parses the cursor file STANDALONE — the same throwaway-SymbolTable parse
 * `scanCandidatesForOccurrences` uses — and delegates the scope-aware,
 * shadowing-safe occurrence binding to `findLocalOccurrences`.
 *
 * W-23631080 adds validation: after resolving the local, the newName is checked
 * against Apex identifier rules. An invalid newName produces a `RenameErrorResult`
 * (NOT null — null means "nothing to rename"), which the LCSAdapter handler
 * converts to an LSP `ResponseError` visible to the client.
 *
 * Returns `null` when there's no cursor text or the cursor doesn't resolve to a
 * renamable local — a field/method/type cursor falls through to the later rename
 * kinds. Returns `RenameErrorResult` when the cursor resolves to a local but the
 * newName is invalid (reserved word, bad chars, etc.).
 *
 * @param req The rename request (cursor position + newName + live cursor text).
 * @returns A single-file `WorkspaceEdit`, `RenameErrorResult`, or `null`.
 */
async function resolveLocalRename(
  req: RenameReq,
): Promise<WorkspaceEditResult | RenameErrorResult | null> {
  // No text → can't parse the cursor file; a local rename is impossible.
  if (typeof req.content !== 'string') return null;

  const {
    CompilerService,
    FullSymbolCollectorListener,
    SymbolTable,
    findLocalOccurrences,
    validateRenameName,
  } = await import('@salesforce/apex-lsp-parser-ast');

  const uri = req.textDocument.uri;

  // Parse + occurrence-binding + edit assembly share one guard: any throw here
  // (a parser edge case, an unexpected symbol shape) must degrade to the same
  // graceful `null` this function returns for every other failure mode, NOT
  // escape as an unhandled Effect defect that fails the whole request. The
  // `error` early-returns below are deliberate validation results, not throws.
  try {
    const t = new SymbolTable();
    const listener = new FullSymbolCollectorListener(t);
    const compiled = new CompilerService().compile(req.content, uri, listener, {
      collectReferences: true,
      resolveReferences: true,
    });
    const table: InstanceType<typeof SymbolTable> =
      compiled?.result instanceof SymbolTable ? compiled.result : t;

    // LSP (0-based line) → parser (1-based line, 0-based column).
    const local = findLocalOccurrences(table, uri, {
      line: req.position.line + 1,
      character: req.position.character,
    });
    // `null` = the cursor isn't on a renamable local (a field/method/type/none),
    // or the local's occurrences couldn't be bound unambiguously. Either way,
    // produce no edit. `identifierRanges` is never empty for a non-null result
    // (the declaration's own range is always the first entry).
    if (!local) return null;

    // W-23631080: canBeRenamed guard. Always true for locals, present for
    // extension by later stdlib-aware groups.
    if (!canBeRenamed(local.declaration)) {
      return {
        error: {
          code: -32600, // InvalidRequest
          message: `Cannot rename '${local.declaration.name}': symbol is not user-sourced`,
        },
      };
    }

    // W-23631080: validate the newName against Apex identifier rules. An invalid
    // name produces a RenameErrorResult (converted to an LSP ResponseError by the
    // LCSAdapter handler), not null — null would hide the error as "nothing to
    // rename".
    const validation = validateRenameName(req.newName, local.declaration.kind);
    if (!validation.ok) {
      emitWorkerLog(
        'warn',
        `[RENAME] invalid newName '${req.newName}' for '${local.declaration.name}': ${validation.message}`,
      );
      return {
        error: {
          code: -32602, // InvalidParams
          message: validation.message,
        },
      };
    }

    // Parser coordinates are 1-based line / 0-based column; LSP is 0-based line,
    // so subtract 1 from each line. Each occurrence becomes a TextEdit replacing
    // the identifier token with the new name.
    const edits = local.identifierRanges.map((r) => ({
      range: {
        start: { line: r.startLine - 1, character: r.startColumn },
        end: { line: r.endLine - 1, character: r.endColumn },
      },
      newText: req.newName,
    }));

    emitWorkerLog(
      'info',
      `[RENAME] local '${local.declaration.name}' → '${req.newName}': ` +
        `${edits.length} edit(s) in ${uri}`,
    );
    return { changes: { [uri]: edits } };
  } catch (err) {
    emitWorkerLog('warn', `[RENAME] local rename failed for ${uri}: ${err}`);
    return null;
  }
}

/**
 * Resolve prepareRename for a local variable or parameter (W-23631080).
 *
 * prepareRename returns the identifier range and placeholder name of the
 * renamable symbol under the cursor, or `null` if the cursor doesn't land on a
 * renamable local. The client uses this to preview the rename UI before the user
 * commits the new name.
 *
 * Reuses resolveLocalRename's standalone-parse resolution (parse cursor file →
 * findLocalOccurrences). CRITICAL: VS Code requires the returned range to
 * CONTAIN the cursor — returning a range that doesn't (e.g. always the
 * declaration when the cursor is on a usage) makes VS Code reject prepareRename
 * and break rename entirely, so we return whichever occurrence contains it.
 *
 * @param req The position request (cursor position + live cursor text).
 * @returns `{ range, placeholder }` where `range` contains the cursor, or `null`.
 */
async function resolvePrepareRenameForLocal(req: PositionReq): Promise<{
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  placeholder: string;
} | null> {
  if (typeof req.content !== 'string') return null;

  const {
    CompilerService,
    FullSymbolCollectorListener,
    SymbolTable,
    findLocalOccurrences,
  } = await import('@salesforce/apex-lsp-parser-ast');

  const uri = req.textDocument.uri;

  try {
    const t = new SymbolTable();
    const listener = new FullSymbolCollectorListener(t);
    const compiled = new CompilerService().compile(req.content, uri, listener, {
      collectReferences: true,
      resolveReferences: true,
    });
    const table: InstanceType<typeof SymbolTable> =
      compiled?.result instanceof SymbolTable ? compiled.result : t;

    // LSP (0-based line) → parser (1-based line, 0-based column).
    const local = findLocalOccurrences(table, uri, {
      line: req.position.line + 1,
      character: req.position.character,
    });
    if (!local || local.identifierRanges.length === 0) return null;

    if (!canBeRenamed(local.declaration)) return null;

    // Return the range CONTAINING the cursor (declaration or usage). Compare in
    // parser space: identifierRanges are 1-based line / 0-based col; req.position
    // is LSP 0-based line, 0-based col.
    const cursorLine = req.position.line + 1;
    const cursorChar = req.position.character;

    // identifierRange columns are half-open [startColumn, endColumn): endColumn
    // is one past the last character (parser builds it as stop.column +
    // text.length). So a cursor exactly at endColumn sits on the whitespace
    // AFTER the identifier and must NOT match — hence `endColumn > cursorChar`,
    // not `>=`. VS Code requires the range returned by prepareRename to CONTAIN
    // the cursor; if none does (a parser edge where the resolved local's own
    // occurrence isn't among identifierRanges), return null rather than a
    // declaration range that doesn't contain the cursor.
    let cursorRange: (typeof local.identifierRanges)[number] | undefined;
    for (const r of local.identifierRanges) {
      const afterStart =
        r.startLine < cursorLine ||
        (r.startLine === cursorLine && r.startColumn <= cursorChar);
      const beforeEnd =
        r.endLine > cursorLine ||
        (r.endLine === cursorLine && r.endColumn > cursorChar);
      if (afterStart && beforeEnd) {
        cursorRange = r;
        break;
      }
    }
    if (!cursorRange) return null;

    return {
      range: {
        start: {
          line: cursorRange.startLine - 1,
          character: cursorRange.startColumn,
        },
        end: {
          line: cursorRange.endLine - 1,
          character: cursorRange.endColumn,
        },
      },
      placeholder: local.declaration.name,
    };
  } catch (err) {
    emitWorkerLog('warn', `[PREPARE_RENAME] failed for ${uri}: ${err}`);
    return null;
  }
}

/**
 * Resolve the declaring-type FQN for the field/property under the cursor
 * (W-23631084 / W-23631086 review finding #2). Walks from the cursor symbol up
 * to its enclosing TypeSymbol via `getContainingType` and returns that type's
 * fully-qualified name — the string `findFieldOccurrences` disambiguates
 * candidate receivers against.
 *
 * Returning the FQN (not the short `.name`) is required to distinguish a nested
 * `OuterOne.Inner.total` from `OuterTwo.Inner.total`: the short name `Inner` is
 * identical for both, so a short-name anchor would rename the wrong class's
 * field. `findFieldOccurrences` compares FQN-to-FQN (case-insensitive, with the
 * block-scope name duplication normalized), so producer and consumer must both
 * speak FQN. Prefer the graph's `.fqn` (the normalized/lowercased index FQN);
 * fall back to `constructFQN` when it is absent.
 *
 * @returns The declaring type's FQN, or `null` if it can't be determined.
 */
async function getDeclaringTypeForCursor(
  svc: RequestServices,
  uri: string,
  position: { line: number; character: number },
): Promise<string | null> {
  try {
    const parserPosition = {
      line: position.line + 1,
      character: position.character,
    };
    const symbol = await resolveCursorSymbol(svc, uri, parserPosition);
    if (!symbol) return null;
    const containingType = await svc.symbolManager.getContainingType(symbol);
    if (!containingType) return null;
    return (
      containingType.fqn ??
      (await svc.symbolManager.constructFQN(containingType)) ??
      containingType.name ??
      null
    );
  } catch {
    return null;
  }
}

/**
 * Build a rename `WorkspaceEdit` for a FIELD or PROPERTY under the cursor
 * (W-23631084). Unlike renameLocal (single-file, lexically scoped), a field is
 * class-scoped and cross-file addressable, so this runs the workspace-wide
 * two-phase scan (coordinator lexical prefilter → per-file standalone parse),
 * then disambiguates each candidate occurrence by its receiver's declared type
 * so `Acct.total` is renamed while an unrelated `Other.total` is not.
 *
 * Occurrences whose receiver can't be resolved locally (a chained `a.b.total`,
 * or a receiver whose type is only known cross-file) are conservatively SKIPPED
 * — never renamed — and counted so the (partial) edit is at least logged. See
 * `findFieldOccurrences`.
 *
 * Returns `null` when the cursor isn't on a renamable field (a local/method/type
 * cursor falls through to its own kind), or a `RenameErrorResult` when the field
 * resolves but the newName is invalid.
 *
 * @param svc Request-pool worker services (needed for the workspace scan).
 * @param req The rename request (cursor position + newName + live cursor text).
 */
async function resolveFieldRename(
  svc: RequestServices,
  req: RenameReq,
): Promise<WorkspaceEditResult | RenameErrorResult | null> {
  const {
    CompilerService,
    ErrorType,
    FullSymbolCollectorListener,
    SymbolKind,
    SymbolTable,
    findFieldOccurrences,
    lexMentionsIdentifier,
    validateRenameName,
  } = await import('@salesforce/apex-lsp-parser-ast');

  const uri = req.textDocument.uri;

  try {
    // Stage 1: recompile the cursor file so the cursor symbol resolves, then
    // load its referenced types (the cursor field may be declared elsewhere).
    const cursorTextAvailable = typeof req.content === 'string';
    const cursorRecompiled = await recompileCursorFileAtFullDetail(
      svc,
      uri,
      req.content,
      { resolveCrossFileReferences: false },
    );
    if (!cursorRecompiled && !cursorTextAvailable) return null;
    await loadReferencedTypesForFile(svc, uri);

    // Stage 2: confirm the cursor is on a field/property.
    const target = await targetSymbolForCursor(svc, uri, req.position);
    if (!target?.name) return null;
    if (target.kind !== 'field' && target.kind !== 'property') return null;

    // Stage 3: the field's declaring type — the disambiguation anchor.
    const declaringType = await getDeclaringTypeForCursor(
      svc,
      uri,
      req.position,
    );
    if (!declaringType) {
      emitWorkerLog(
        'warn',
        `[RENAME] cannot determine declaring type for field '${target.name}' in ${uri}`,
      );
      return null;
    }

    // Stage 4: validate the newName (same rules as renameLocal). An invalid
    // name is a RenameErrorResult (→ LSP ResponseError), not null. target.kind
    // is a plain string from targetSymbolForCursor but is already narrowed to
    // 'field'/'property' above, which are exactly SymbolKind.Field/.Property.
    const validation = validateRenameName(
      req.newName,
      target.kind === 'property' ? SymbolKind.Property : SymbolKind.Field,
    );
    if (!validation.ok) {
      return { error: { code: -32602, message: validation.message } };
    }

    // Stage 5: obtain the FULL set of stored workspace documents from the data
    // owner, WITHOUT the raw-text word-boundary prefilter (skipTextFilter: true).
    // Rename candidate discovery no longer depends on a raw-text regex prefilter
    // (W-23631084 review, blocking design violation): a `\b<name>\b` false
    // negative would silently drop a file and dangle a reference after the
    // declaration renames. Instead we conservatively parse every stored doc —
    // phase-2 (below) does a standalone parse + parser-owned occurrence
    // classification per candidate and declines on any unsafe/unprovable
    // reference, so widening the candidate set to "all stored docs" is
    // correct-by-construction (no regex can drop a file). find-references is
    // untouched: it omits the flag and keeps its intentional textMentionsSymbol
    // prefilter. RESIDUAL CAVEAT: only LOADED/stored docs are scanned — a
    // workspace file the data owner never loaded is out of scope here (a
    // workspace-load-completeness limit shared with find-references), not a regex
    // gap. The cursor file is overridden with the live buffer for fidelity below.
    let scan: { candidates?: Array<{ uri: string; content: string }> };
    try {
      scan = (await requestCoordinatorAssistancePromiseShared(
        'dataOwner:FindOccurrenceCandidates',
        { symbolName: target.name, skipTextFilter: true },
        true,
      )) as { candidates?: Array<{ uri: string; content: string }> };
    } catch (err) {
      // The full stored-document set could not be obtained (query failure). We
      // cannot verify the workspace is free of references to the field, so we
      // must NOT proceed on a partial/absent set and emit a broken partial edit.
      // Preserve uncertainty → decline (W-23631084 review).
      const message =
        `Cannot verify references to '${target.name}': the workspace document ` +
        'set could not be retrieved, so this rename cannot be applied safely. ' +
        `(${err})`;
      emitWorkerLog('warn', `[RENAME] declined field rename — ${message}`);
      return { error: { code: -32600, message } }; // InvalidRequest
    }
    // An EMPTY stored set is NOT a failure: with skipTextFilter the data owner
    // returns every stored doc, so empty simply means the store holds no OTHER
    // files. The cursor file's live buffer is always available (req.content) and
    // is scanned unconditionally below (finding #5), so an unopened/unsaved
    // cursor file with an empty store still renames its own occurrences. Only a
    // query ERROR (handled above) is genuine unavailability that forces a
    // decline; an empty result must fall through to the cursor-buffer scan.
    const rawCandidates = scan?.candidates ?? [];
    let candidates: Array<{ uri: string; content: string }> = rawCandidates;
    if (typeof req.content === 'string') {
      // Override the cursor file with the live buffer when the prefilter already
      // returned it, so we scan the unsaved edits rather than stored text.
      let cursorPresent = false;
      candidates = rawCandidates.map((c) => {
        if (c.uri === uri) {
          cursorPresent = true;
          return { ...c, content: req.content as string };
        }
        return c;
      });
      // Finding #5 (W-23631086 review): the data owner returns only STORED docs
      // (now the FULL stored set, since rename skips the text prefilter), so the
      // cursor file can still be ABSENT — an unsaved/newly-modified buffer the
      // data owner has never stored. If we don't scan it, its occurrences are
      // silently missed while the declaration renames → a dangling partial edit.
      // Always ensure the cursor URI is scanned with the live buffer content. The
      // Stage 6 loop dedups by uri via `seen`, so this never double-scans when the
      // file was present.
      if (!cursorPresent) {
        candidates = [{ uri, content: req.content }, ...candidates];
      }
    }

    // Stage 6: phase-2 standalone parse + receiver-type disambiguation per
    // candidate file.
    // NOTE (Finding #6, W-23631086 review): the reviewer asked for cooperative
    // cancellation between candidate files. There is no CancellationToken in
    // this path — RenameReq is `PositionReq & { newName }` and nothing threads a
    // token to the worker — so there is no infra to check here. Cancellation for
    // this request kind would need to be added upstream (the pool-side dispatch
    // pattern documented in the worker-pool-cancellation memory: debounce before
    // dispatch). Not inventing it here.
    const allOccurrences: Array<{ uri: string; range: OccurrenceRange }> = [];
    let totalSkipped = 0;
    const unsafeOccurrences: Array<{ uri: string; reason: string }> = [];
    const seen = new Set<string>();
    for (const candidate of candidates) {
      if (seen.has(candidate.uri)) continue;
      seen.add(candidate.uri);
      try {
        const t = new SymbolTable();
        const listener = new FullSymbolCollectorListener(t);
        const compiled = new CompilerService().compile(
          candidate.content,
          candidate.uri,
          listener,
          { collectReferences: true, resolveReferences: true },
        );

        // Finding #2 (W-23631086 re-review): CompilerService.compile RECOVERS
        // from malformed Apex — it returns a (partial) SymbolTable plus a
        // non-empty `errors` array rather than throwing. A candidate that
        // lexically mentions the field but failed to PARSE cleanly may have
        // DROPPED the very occurrence we need to rewrite, so its symbol table is
        // an incomplete view. Treating that as "no occurrences" and still
        // renaming the declaration would emit a broken partial edit. Treat any
        // candidate with SYNTAX errors (or no SymbolTable) as UNSAFE → decline,
        // exactly like a thrown scan failure.
        //
        // Count ONLY syntax errors: a standalone single-file parse cannot resolve
        // cross-file references, so `errors` routinely contains benign SEMANTIC
        // (unresolved-reference) entries for otherwise-valid files. Declining on
        // those would reject nearly every real multi-file rename. Syntax errors,
        // by contrast, mean the parse tree itself is broken and occurrences may
        // be missing.
        const syntaxErrorCount = (compiled?.errors ?? []).filter(
          (e) => e.type === ErrorType.Syntax,
        ).length;
        if (
          !(compiled?.result instanceof SymbolTable) ||
          syntaxErrorCount > 0
        ) {
          // A broken parse only endangers THIS rename if the candidate could
          // actually reference the field. Since renameField now scans EVERY
          // stored doc (no raw-text prefilter, W-23631084 review), an
          // unconditional decline here would let one unparseable file ANYWHERE
          // in the workspace block every field rename. A field reference always
          // emits an identifier token equal to the field name, so if the LEXER
          // (parser-owned, not regex) finds no such token, the file provably
          // cannot reference the field and is safe to skip. If the token IS
          // present (or lexing itself failed → conservative), keep the
          // fail-closed decline (the broken parse may have dropped the
          // occurrence we would need to rewrite).
          if (!lexMentionsIdentifier(candidate.content, target.name)) {
            continue;
          }
          const detail = !(compiled?.result instanceof SymbolTable)
            ? 'no-result'
            : `${syntaxErrorCount} syntax error(s)`;
          emitWorkerLog(
            'warn',
            `[RENAME] field phase2 candidate ${candidate.uri} did not parse ` +
              `cleanly (${detail}); declining to avoid a partial edit`,
          );
          unsafeOccurrences.push({
            uri: candidate.uri,
            reason: `candidate-parse-incomplete:${detail}`,
          });
          continue;
        }
        const table: InstanceType<typeof SymbolTable> = compiled.result;

        const { occurrences, skipped, unsafe } = findFieldOccurrences(
          table,
          candidate.uri,
          target,
          declaringType,
        );
        for (const occ of occurrences) {
          allOccurrences.push({ uri: occ.uri, range: occ.identifierRange });
        }
        totalSkipped += skipped.length;
        for (const u of unsafe) {
          unsafeOccurrences.push({ uri: candidate.uri, reason: u.reason });
        }
      } catch (err) {
        // Finding #3 (W-23631086 review): a candidate we could not parse/scan
        // might CONTAIN a reference to the target field. Silently continuing and
        // still returning a WorkspaceEdit would rename the declaration (and other
        // files) while leaving this file's references dangling — a broken partial
        // edit. Treat any scan failure as UNSAFE so the existing "decline whole
        // rename if unsafe" logic fires, rather than emitting a partial edit.
        emitWorkerLog(
          'warn',
          `[RENAME] field phase2 scan failed for ${candidate.uri}: ${err}`,
        );
        unsafeOccurrences.push({
          uri: candidate.uri,
          reason: `candidate-scan-failed: ${err}`,
        });
      }
    }

    // Decline the whole rename if ANY candidate held a same-named field access we
    // couldn't prove is unrelated (a possible INHERITED reference — `super.field`
    // or a bare inherited field in a subclass — or an unresolvable receiver).
    // Applying edits while silently omitting those would emit a broken partial
    // WorkspaceEdit that leaves references dangling. Establishing the inheritance
    // relationship needs the cross-file graph this pool path lacks, so we decline
    // rather than corrupt (W-23631084 review). Return a RenameErrorResult so the
    // client shows a rename-failure toast instead of applying a partial edit.
    if (unsafeOccurrences.length > 0) {
      const sample = unsafeOccurrences
        .slice(0, 3)
        .map((u) => `${u.uri} (${u.reason})`)
        .join(', ');
      const message =
        `Cannot safely rename '${target.name}': ${unsafeOccurrences.length} ` +
        'reference(s) may target an inherited or cross-file member that this ' +
        'rename cannot resolve without risking a broken partial edit. ' +
        `Examples: ${sample}.`;
      emitWorkerLog('warn', `[RENAME] declined field rename — ${message}`);
      return { error: { code: -32600, message } }; // InvalidRequest
    }

    // Include the field's own declaration token. findOccurrencesInFile matches
    // only FIELD_ACCESS / VARIABLE_USAGE references, never the declaration
    // (which is a symbol, not a reference), so it must be added explicitly —
    // otherwise a field used only via implicit-this in its own file would
    // rename the usages but leave the declaration untouched. Deduped by the
    // position set in Stage 7.
    const declaration = await declarationLocationForCursor(
      svc,
      uri,
      req.position,
    );
    if (declaration) {
      allOccurrences.push({
        uri: declaration.uri,
        range: declaration.identifierRange,
      });
    }

    if (allOccurrences.length === 0) return null;

    emitWorkerLog(
      'info',
      `[RENAME] field '${declaringType}.${target.name}' → '${req.newName}': ` +
        `${allOccurrences.length} edit(s), ${totalSkipped} skipped ` +
        '(unresolvable receiver)',
    );

    // Stage 7: assemble the multi-file WorkspaceEdit (parser 1-based line →
    // LSP 0-based). Dedup edits per URI by position — the parser emits a token
    // more than once and candidate files can overlap.
    const changes: Record<
      string,
      Array<{
        range: {
          start: { line: number; character: number };
          end: { line: number; character: number };
        };
        newText: string;
      }>
    > = {};
    const seenEdits = new Set<string>();
    for (const occ of allOccurrences) {
      const r = occ.range;
      const key =
        `${occ.uri}\x1f${r.startLine}:${r.startColumn}:` +
        `${r.endLine}:${r.endColumn}`;
      if (seenEdits.has(key)) continue;
      seenEdits.add(key);
      (changes[occ.uri] ??= []).push({
        range: {
          start: {
            line: occ.range.startLine - 1,
            character: occ.range.startColumn,
          },
          end: { line: occ.range.endLine - 1, character: occ.range.endColumn },
        },
        newText: req.newName,
      });
    }

    return { changes };
  } catch (err) {
    emitWorkerLog('warn', `[RENAME] field rename failed for ${uri}: ${err}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Enrichment dispatch handlers (Step 11 on the original file)
// ---------------------------------------------------------------------------

const requestHandlers = {
  DispatchHover: effectRequestHandler<PositionReq>(
    'DispatchHover',
    (svc, req) =>
      Effect.gen(function* () {
        const uri = req.textDocument.uri;
        const prepared = yield* prepareLspRequestCursor(
          svc,
          'hover',
          uri,
          req.content,
          req.position,
          req.documentVersion,
        );

        const result = yield* Effect.fn('worker.hover.process', {
          attributes: { uri },
        })(function* () {
          const hoverResult = yield* Effect.promise(() =>
            svc.hoverService.processHover(
              {
                textDocument: { uri },
                position: req.position,
              },
              {
                prerequisitesPrepared: true,
              },
            ),
          );
          const stateAttributes = yield* safelyCaptureResolutionStateAttributes(
            svc,
            'hover',
            req,
            prepared,
            hoverResult,
          );
          yield* Effect.annotateCurrentSpan(stateAttributes);
          return hoverResult;
        })();

        const wroteBack = yield* Effect.fn('worker.hover.writeBack', {
          attributes: { uri },
        })(function* () {
          return yield* writeBackPreparedLspRequest(svc, prepared);
        })();

        yield* Effect.annotateCurrentSpan({
          'hover.cursor_cache_hit': prepared.cacheHit,
          'hover.write_back': wroteBack,
        });

        return result;
      }),
  ),
  DispatchCompletion: effectRequestHandler<CompletionReq>(
    'DispatchCompletion',
    (svc, req) =>
      Effect.gen(function* () {
        const prepared = yield* prepareLspRequestCursor(
          svc,
          'completion',
          req.textDocument.uri,
          req.content,
          req.position,
          req.documentVersion,
        );
        if (!prepared.ready) {
          return { items: [], isIncomplete: true };
        }

        // triggerKind crosses the wire as a plain number but IS a
        // CompletionTriggerKind value (1/2/3); the worker avoids importing LSP
        // types, so build the params untyped and let the service narrow.
        const completionParams = {
          textDocument: { uri: req.textDocument.uri },
          position: req.position,
          ...(req.context ? { context: req.context } : {}),
        };
        const result = yield* Effect.fn('worker.completion.process', {
          attributes: { uri: req.textDocument.uri },
        })(function* () {
          const completionResult = yield* Effect.promise(() =>
            svc.completionService.processCompletionWithReadiness(
              completionParams as Parameters<
                typeof svc.completionService.processCompletionWithReadiness
              >[0],
              { prerequisitesPrepared: true },
            ),
          );
          const stateAttributes = yield* safelyCaptureResolutionStateAttributes(
            svc,
            'completion',
            req,
            prepared,
            completionResult,
          );
          yield* Effect.annotateCurrentSpan(stateAttributes);
          return completionResult;
        })();

        yield* writeBackPreparedLspRequest(svc, prepared);

        return completionResultForWire(result);
      }),
  ),
  DispatchSignatureHelp: effectRequestHandler<SignatureHelpReq>(
    'DispatchSignatureHelp',
    (svc, req) =>
      Effect.gen(function* () {
        const prepared = yield* prepareLspRequestCursor(
          svc,
          'signatureHelp',
          req.textDocument.uri,
          req.content,
          req.position,
          req.documentVersion,
        );
        if (!prepared.ready) return null;
        const params = {
          textDocument: { uri: req.textDocument.uri },
          position: req.position,
          ...(req.context !== undefined ? { context: req.context } : {}),
        };
        const result = yield* Effect.fn('worker.signatureHelp.process', {
          attributes: { uri: req.textDocument.uri },
        })(function* () {
          return yield* Effect.promise(() =>
            svc.signatureHelpService.processSignatureHelp(
              params as Parameters<
                typeof svc.signatureHelpService.processSignatureHelp
              >[0],
              { prerequisitesPrepared: true },
            ),
          );
        })();
        yield* writeBackPreparedLspRequest(svc, prepared);
        return result;
      }),
  ),
  DispatchCodeAction: effectRequestHandler<CodeActionReq>(
    'DispatchCodeAction',
    (svc, req) =>
      Effect.gen(function* () {
        const prepared = yield* prepareLspRequestCursor(
          svc,
          'codeAction',
          req.textDocument.uri,
          req.content,
        );
        if (!prepared.ready) return [];
        const params = {
          textDocument: { uri: req.textDocument.uri },
          range: req.range,
          ...(req.context !== undefined ? { context: req.context } : {}),
        };
        const result = yield* Effect.promise(() =>
          svc.codeActionService.processCodeAction(
            params as Parameters<
              typeof svc.codeActionService.processCodeAction
            >[0],
          ),
        );
        yield* writeBackPreparedLspRequest(svc, prepared);
        return result;
      }),
  ),
  DispatchDefinition: effectRequestHandler<PositionReq>(
    'DispatchDefinition',
    (svc, req) =>
      Effect.gen(function* () {
        const prepared = yield* prepareLspRequestCursor(
          svc,
          'definition',
          req.textDocument.uri,
          req.content,
          req.position,
          req.documentVersion,
        );
        if (!prepared.ready) return null;

        const result = yield* Effect.fn('worker.definition.process', {
          attributes: { uri: req.textDocument.uri },
        })(function* () {
          const definitionResult = yield* Effect.promise(() =>
            svc.definitionService.processDefinition(
              {
                textDocument: { uri: req.textDocument.uri },
                position: req.position,
              },
              { prerequisitesPrepared: true },
            ),
          );
          const stateAttributes = yield* safelyCaptureResolutionStateAttributes(
            svc,
            'definition',
            req,
            prepared,
            definitionResult,
          );
          yield* Effect.annotateCurrentSpan(stateAttributes);
          return definitionResult;
        })();

        yield* writeBackPreparedLspRequest(svc, prepared);

        return result;
      }),
  ),
  DispatchReferences: requestHandler<RefsReq>(
    'DispatchReferences',
    async (svc, req) => {
      // Find-references (W-23272674) runs a workspace-wide, two-phase scan:
      //   phase-1 (data-owner): cheap lexical prefilter of all stored workspace
      //     documents for the target name → candidate {uri, content};
      //   phase-2: parse each candidate STANDALONE and scan its own references
      //     for genuine usages of the target — no shared-graph ingest (see
      //     scanCandidatesForOccurrences / memory
      //     project-findreferences-standalone-pivot).
      // The cursor file still needs a full-detail recompile so the TARGET under
      // the cursor resolves to a name + kind (the data-owner serves public-api
      // detail, bodies stripped). That single recompile is bounded and stable;
      // the former per-candidate ingest was the unbounded cost that timed out.
      //
      // Stages 1-4 (recompile → resolve target → prefilter → scan) are the
      // kind-agnostic core shared with rename (W-23631073); this handler owns
      // only the references-specific Location[] assembly below.
      const resolved = await resolveOccurrencesForCursor(
        svc,
        req,
        'REFERENCES',
      );
      if (!resolved) return [];
      const { occurrences } = resolved;

      // Build the LSP result. Parser coordinates are 1-based line / 0-based
      // column; LSP is 0-based line, so subtract 1 from each line. De-dupe by
      // (uri, range) so a symbol referenced twice at the same token — or the
      // declaration coinciding with a reference — is one entry.
      const locations: Array<{
        uri: string;
        range: {
          start: { line: number; character: number };
          end: { line: number; character: number };
        };
      }> = [];
      const seenRanges = new Set<string>();
      const pushLocation = (
        uri: string,
        r: {
          startLine: number;
          startColumn: number;
          endLine: number;
          endColumn: number;
        },
      ): void => {
        // NUL separator between uri and range so a URI ending in digits can't
        // abut the line number and collapse two distinct (uri,range) pairs onto
        // one key. Pure safety; behavior unchanged for real URIs.
        const key = `${uri}\x1f${r.startLine}:${r.startColumn}:${r.endLine}:${r.endColumn}`;
        if (seenRanges.has(key)) return;
        seenRanges.add(key);
        locations.push({
          uri,
          range: {
            start: { line: r.startLine - 1, character: r.startColumn },
            end: { line: r.endLine - 1, character: r.endColumn },
          },
        });
      };

      // Include the declaration when requested. The cursor file was recompiled
      // into the shared graph above, so the precise symbol at the cursor (or
      // the symbol its usage resolves to) carries the declaration's identifier
      // range.
      if (req.context.includeDeclaration) {
        const decl = await declarationLocationForCursor(
          svc,
          req.textDocument.uri,
          req.position,
        );
        if (decl) pushLocation(decl.uri, decl.identifierRange);
      }

      for (const occ of occurrences) {
        pushLocation(occ.uri, occ.identifierRange);
      }

      emitWorkerLog(
        'info',
        `[REFERENCES] done (${locations.length} location(s))`,
      );
      return locations;
    },
  ),
  // renameLocal (W-23631077): resolve the local variable/parameter under the
  // cursor and return a single-file WorkspaceEdit renaming its declaration and
  // every scope-bound usage. A local is single-file and lexically scoped, so
  // this parses the cursor file standalone rather than running the workspace
  // scan (which would surface same-named locals in other files). A cursor that
  // doesn't resolve to a renamable local returns `null` (LSP: "nothing to
  // rename"); the field/method/type kinds land in later groups.
  DispatchRename: requestHandler<RenameReq>(
    'DispatchRename',
    async (svc, req) => {
      // renameLocal first (single-file, no svc needed). A `null` result means
      // the cursor isn't a local — fall through to renameField (W-23631084),
      // which needs `svc` for the workspace-wide two-phase scan. A field/method/
      // type cursor that isn't a field still returns null from both.
      const local = await resolveLocalRename(req);
      if (local !== null) return local;
      return resolveFieldRename(svc, req);
    },
  ),
  // W-23631080: prepareRename for locals. Returns the identifier range +
  // placeholder of the renamable local under the cursor, or `null` when the
  // cursor doesn't land on a renamable local.
  DispatchPrepareRename: requestHandler<PositionReq>(
    'DispatchPrepareRename',
    async (_svc, req) => resolvePrepareRenameForLocal(req),
  ),
  DispatchImplementation: effectRequestHandler<PositionReq>(
    'DispatchImplementation',
    (svc, req) =>
      Effect.gen(function* () {
        const prepared = yield* prepareLspRequestCursor(
          svc,
          'implementation',
          req.textDocument.uri,
          req.content,
        );
        if (!prepared.ready) return null;

        // Go-to-implementation must see every implementor/subtype of the target
        // type, which live in *other* files. loadDependentsForReferences pulls the
        // inbound tables (files whose declared symbols reference symbols in this
        // file) from the data-owner AND resolves each one's cross-file references,
        // so the implements/extends edges authored on those implementor/subclass
        // files land in this worker's reverse index — which is what
        // ImplementationProcessingService.findSubtypes reads.
        yield* Effect.promise(() =>
          loadDependentsForReferences(svc, req.textDocument.uri),
        );

        // Also resolve the target file's own cross-file refs (e.g. an interface
        // that extends another interface) so the full supertype graph is present.
        yield* svc.symbolManager.resolveCrossFileReferencesForFile(
          req.textDocument.uri,
        );

        const result = yield* Effect.promise(() =>
          svc.implementationService.processImplementation({
            textDocument: { uri: req.textDocument.uri },
            position: req.position,
          }),
        );

        yield* writeBackPreparedLspRequest(svc, prepared);

        return result;
      }),
  ),
  DispatchDocumentSymbol: effectRequestHandler<DocWithContentReq>(
    'DispatchDocumentSymbol',
    (svc, req) =>
      Effect.gen(function* () {
        // documentSymbol re-compiles the file from its TEXT
        // (DefaultApexDocumentSymbolProvider parses with
        // FullSymbolCollectorListener for a complete hierarchy) rather than
        // reading the dataOwner symbol graph. So the pool worker must have the
        // document text in local storage: thread req.content into
        // loadSymbolDataForEnrichment, which stores it before the provider runs.
        // Without it the provider's storage.getDocument() returns null and the
        // outline is empty (the cold-open regression).
        yield* loadSymbolDataForEnrichment(
          svc,
          req.textDocument.uri,
          req.content,
        );
        return yield* Effect.promise(() =>
          svc.documentSymbolService.processDocumentSymbol({
            textDocument: { uri: req.textDocument.uri },
          }),
        );
      }),
  ),
  DispatchCodeLens: effectRequestHandler<DocOnlyReq>(
    'DispatchCodeLens',
    (svc, req) =>
      Effect.gen(function* () {
        yield* loadCodeLensSymbolData(svc, req.textDocument.uri);
        return yield* Effect.fn('worker.lspRequest.processCodeLens', {
          attributes: { uri: req.textDocument.uri },
        })(function* () {
          return yield* Effect.promise(() =>
            svc.codeLensService.processCodeLens({
              textDocument: { uri: req.textDocument.uri },
            }),
          );
        })();
      }),
  ),
  DispatchDiagnostic: effectRequestHandler<DocOnlyReq>(
    'DispatchDiagnostic',
    (svc, req) =>
      Effect.gen(function* () {
        // DiagnosticProcessingService owns validator-oriented compilation.
        // Store live text and load the local graph here, but do not run the
        // shared cursor compiler and duplicate that compute.
        const { version, detailLevel } = yield* loadSymbolDataForEnrichment(
          svc,
          req.textDocument.uri,
          req.content,
        );

        const result = yield* Effect.promise(() =>
          svc.diagnosticService.processDiagnostic({
            textDocument: { uri: req.textDocument.uri },
          }),
        );

        const table = yield* Effect.promise(() =>
          svc.symbolManager.getSymbolTableForFile(req.textDocument.uri),
        );
        const achievedDetailLevel = table?.getDetailLevel() ?? null;
        if (
          achievedDetailLevel !== null &&
          shouldEnrich(detailLevel, achievedDetailLevel)
        ) {
          yield* writeBackEnrichedSymbols(
            svc,
            req.textDocument.uri,
            version,
            achievedDetailLevel,
          );
        }

        return result;
      }),
  ),
  DispatchCrossFileEnrichment: effectRequestHandler<DocOnlyReq>(
    'DispatchCrossFileEnrichment',
    (svc, req) =>
      Effect.gen(function* () {
        const { version } = yield* loadSymbolDataForEnrichment(
          svc,
          req.textDocument.uri,
        );
        yield* svc.symbolManager.resolveCrossFileReferencesForFile(
          req.textDocument.uri,
        );
        yield* writeBackEnrichedSymbols(
          svc,
          req.textDocument.uri,
          version,
          'public-api',
        );
        return { resolved: true };
      }),
  ),
};

// ---------------------------------------------------------------------------
// Write-back metrics tracking (worker.platform.ts:161-194)
//
// Not named in the plan's export list — moved here because it's mutated
// inside UpdateSymbolSubset, which is moving in this task. The two exported
// accessor wrappers Node carried (`getWriteBackMetrics`/
// `resetWriteBackMetrics`) are confirmed dead (zero consumers repo-wide, per
// the plan doc) and are intentionally NOT re-exported here — only the
// underlying mutable object, which UpdateSymbolSubset needs, moves.
// ---------------------------------------------------------------------------

interface WriteBackMetrics {
  attempted: number;
  accepted: number;
  rejectedVersionMismatch: number;
  rejectedDocumentMissing: number;
  rejectedDetailLevel: number;
  totalSymbolsMerged: number;
}

const writeBackMetrics: WriteBackMetrics = {
  attempted: 0,
  accepted: 0,
  rejectedVersionMismatch: 0,
  rejectedDocumentMissing: 0,
  rejectedDetailLevel: 0,
  totalSymbolsMerged: 0,
};

// ---------------------------------------------------------------------------
// Handlers — one per _tag in AllWorkerRequests
// ---------------------------------------------------------------------------

type SerializedWorkerHandlers = WorkerRunner.SerializedRunner.Handlers<
  Schema.Schema.Type<typeof AllWorkerRequests>
>;

type UntypedWorkerHandler = (
  request: never,
) => Effect.Effect<unknown, unknown, never>;

/**
 * Apply the incoming coordinator context and create one processing span for a
 * serialized worker request. Keeping this at the runner boundary prevents a
 * role-specific handler factory from accidentally being the only traced path.
 */
export function withWorkerRequestTracing<A, E>(
  tag: string,
  request: { readonly traceContext?: string },
  effect: Effect.Effect<A, E, never>,
): Effect.Effect<A, E, never> {
  const role = assignedRole ?? 'unassigned';
  const tracedEffect = Effect.fn(`worker.${role}.${tag}`, {
    attributes: { telemetryIgnore: true, 'worker.role': role },
  })(() => effect)();

  return workerTracingHooks.withParent(request, tracedEffect);
}

const compilationHandlers = createCompilationWorkerHandlers();

/**
 * Walk the type family (ancestors and descendants) for a given type.
 * Returns all transitive supertypes and subtypes, filtered to type symbols.
 * Reusable helper for hierarchy-aware rename validation — will be extended
 * in WI 5.2 (renameMethod) to handle interfaces + implementors.
 *
 * @param svc Data-owner services with symbolManager access
 * @param definingType The type whose family to walk
 * @returns Object with ancestors and descendants arrays
 */
function walkTypeFamily(
  svc: DataOwnerServices,
  definingType: ApexSymbol,
): Effect.Effect<
  { ancestors: ApexSymbol[]; descendants: ApexSymbol[] },
  never,
  never
> {
  return Effect.gen(function* () {
    const { inTypeSymbolGroup } = yield* Effect.promise(
      () => import('@salesforce/apex-lsp-parser-ast'),
    );

    const allAncestors = yield* Effect.promise(() =>
      svc.symbolManager.findSupertypes(definingType),
    );
    const ancestors = allAncestors.filter(inTypeSymbolGroup);

    const allDescendants = yield* Effect.promise(() =>
      svc.symbolManager.findSubtypes(definingType),
    );
    const descendants = allDescendants.filter(inTypeSymbolGroup);

    return { ancestors, descendants };
  });
}

const untracedHandlers: SerializedWorkerHandlers = {
  InitializeCompilationWorker: (req) =>
    guardRole('InitializeCompilationWorker').pipe(
      Effect.flatMap(() =>
        compilationHandlers.InitializeCompilationWorker(req),
      ),
    ),

  CompileApexFile: (req) =>
    guardRole('CompileApexFile').pipe(
      Effect.flatMap(() => compilationHandlers.CompileApexFile(req)),
    ),

  WorkerInit: (req) => {
    if (assignedRole !== null) {
      return Effect.die(
        new Error('WorkerInit received but role already assigned'),
      );
    }
    if (req.protocolVersion !== WIRE_PROTOCOL_VERSION) {
      return Effect.die(
        new Error(
          `Worker protocol mismatch: coordinator=${req.protocolVersion}, ` +
            `worker=${WIRE_PROTOCOL_VERSION}`,
        ),
      );
    }
    setAssignedRole(req.role);
    if (req.logLevel) {
      setWorkerLogLevel(req.logLevel);
    }
    const resolvedServerMode = req.serverMode ?? 'production';
    ApexCapabilitiesManager.getInstance().setMode(resolvedServerMode);
    (globalThis as Record<string, unknown>).__apexWorkerInitServerMode =
      resolvedServerMode;

    // Initialize worker tracing if span collector URL provided (desktop only)
    if (req.spanCollectorUrl) {
      const serviceName = `apex-ls-worker-${req.role}`;
      workerTracingHooks.initialize(req.spanCollectorUrl, serviceName);
    }

    return Effect.gen(function* () {
      yield* Effect.logInfo(
        `[worker] role=${req.role} protocol=v${req.protocolVersion}/${WIRE_PROTOCOL_VERSION}` +
          ` logLevel=${currentWorkerLogLevel}` +
          (req.spanCollectorUrl ? ' tracing=enabled' : ''),
      );
    }).pipe(Effect.flatMap(() => handleWorkerInitRole(req)));
  },

  PingWorker: (req) =>
    guardRole('PingWorker').pipe(Effect.map(() => ({ echo: req.echo }))),

  WorkerRemoteStdlibWarmup: (_req) =>
    guardRole('WorkerRemoteStdlibWarmup').pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          if (assignedRole === 'dataOwner') {
            yield* ensureDataOwnerServices;
            yield* Effect.tryPromise({
              try: () => warmRemoteStdlibNamespaceCacheShared(),
              catch: (e) => ({
                _tag: 'WorkerRemoteStdlibWarmupError' as const,
                message: e instanceof Error ? e.message : String(e),
              }),
            });
          } else if (assignedRole === 'lspRequest') {
            yield* ensureRequestServices;
            yield* Effect.tryPromise({
              try: () => warmRemoteStdlibNamespaceCacheShared(),
              catch: (e) => ({
                _tag: 'WorkerRemoteStdlibWarmupError' as const,
                message: e instanceof Error ? e.message : String(e),
              }),
            });
          } else if (assignedRole === 'resourceLoader') {
            // resourceLoader IS the stdlib source - warm it by initializing ResourceLoader
            // which triggers stdlib protobuf loading and namespace indexing
            const { ResourceLoader } = yield* Effect.promise(
              () => import('@salesforce/apex-lsp-parser-ast'),
            );
            yield* Effect.tryPromise({
              try: () => ResourceLoader.getInstance().initialize(),
              catch: (e) => ({
                _tag: 'WorkerRemoteStdlibWarmupError' as const,
                message: e instanceof Error ? e.message : String(e),
              }),
            });
          }
          return { ok: true as const };
        }),
      ),
    ),

  DataOwnerPreloadStandardNamespaces: (req) =>
    guardRole('DataOwnerPreloadStandardNamespaces').pipe(
      Effect.flatMap(() =>
        dataOwnerWrite(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;
            const result = yield* Effect.tryPromise({
              try: () => preloadStandardNamespaces(svc, req.namespaces),
              catch: (e) => ({
                _tag: 'DataOwnerPreloadStandardNamespacesError' as const,
                message: e instanceof Error ? e.message : String(e),
              }),
            });
            yield* Effect.logInfo(
              `[DATA-OWNER] stdlib preload: ${result.loadedClasses}/${result.totalClasses} classes ` +
                `from [${result.namespaces.join(', ')}]`,
            );
            return {
              namespaces: [...result.namespaces],
              loadedClasses: result.loadedClasses,
              totalClasses: result.totalClasses,
              missingNamespaces: [...result.missingNamespaces],
              failedClasses: [...result.failedClasses],
            };
          }),
        ),
      ),
    ),

  // -- Data-owner handlers (routed through internal tiered queue) ------------

  QuerySymbolSubset: (req) =>
    guardRole('QuerySymbolSubset').pipe(
      Effect.flatMap(() =>
        dataOwnerRead(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;
            const sm = svc.symbolManager;
            const storage = svc.storageManager.getStorage();
            const cache = getDocumentStateCache();

            const entries: Record<string, unknown> = {};
            const versions: Record<string, number> = {};
            const detailLevels: Record<
              string,
              'public-api' | 'protected' | 'private' | 'full'
            > = {};
            const includeEntries = req.includeEntries !== false;

            const serializeSt = (
              st: Awaited<ReturnType<typeof sm.getSymbolTableForFile>> & object,
            ) =>
              cloneForWire({
                symbols: st.getAllSymbols(),
                references: st.getAllReferences(),
                hierarchicalReferences: st.getAllHierarchicalReferences(),
                metadata: st.getMetadata(),
                fileUri: st.getFileUri(),
              });

            for (const uri of req.uris) {
              if (includeEntries) {
                const st = yield* Effect.promise(() =>
                  sm.getSymbolTableForFile(uri),
                );
                entries[uri] = st ? serializeSt(st) : null;
              }

              // Get document version
              const doc = yield* Effect.promise(() => storage.getDocument(uri));
              versions[uri] = doc?.version ?? -1;

              // Get detail level from cache
              const state = cache.getCurrentState(uri);
              const level = state?.detailLevel ?? 'public-api';
              // Ensure type safety
              detailLevels[uri] =
                level === 'public-api' ||
                level === 'protected' ||
                level === 'private' ||
                level === 'full'
                  ? level
                  : 'public-api';
            }

            return { entries, versions, detailLevels };
          }),
        ),
      ),
    ),

  // Deterministic readiness wait: block until the symbol graph for
  // {uri, version} is populated, or report why not.
  //
  // "Snapshot in runner, await outside": the serial data-owner fiber must never
  // block on a Deferred whose resolver (UpdateSymbolSubset) is queued behind it
  // on that same fiber — that is a self-deadlock. So the only work done *inside*
  // the runner (peekReadiness) is a fast, non-blocking read that returns either
  // an immediate verdict or the latch's Deferred handle. The actual wait happens
  // here, on the handler's own fiber.
  AwaitSymbolReadiness: (req) =>
    guardRole('AwaitSymbolReadiness').pipe(
      Effect.flatMap(() => {
        // Peek: resolve the current state through the serial runner without
        // blocking it. Returns the latch's Deferred only when a compile for this
        // (or a newer) version is actually pending.
        // A negative req.version means "match whatever version is currently
        // armed" — the coordinator gate uses it when the triggering request
        // (e.g. documentSymbol) carries no version of its own and simply wants
        // the latest open/change to finish compiling.
        const matchLatest = req.version < 0;
        const peekReadiness = dataOwnerRead(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;
            const st = yield* Effect.promise(() =>
              svc.symbolManager.getSymbolTableForFile(req.uri),
            );
            const latch = readinessLatches.get(req.uri);
            if (symbolsAreCurrent(req.uri, req.version, st != null)) {
              return { kind: 'ready' as const };
            }
            if (!latch) {
              // Nothing armed: no open/change is driving a compile for this URI.
              // The coordinator decides whether to fall back to a local handler.
              return { kind: 'no-latch' as const };
            }
            if (!matchLatest && latch.version > req.version) {
              // A newer edit superseded the version we were asked about.
              return { kind: 'stale-version' as const };
            }
            return { kind: 'await' as const, deferred: latch.deferred };
          }),
        );

        return Effect.gen(function* () {
          const snapshot = yield* peekReadiness;
          if (snapshot.kind === 'ready') {
            return { ready: true };
          }
          if (snapshot.kind === 'no-latch') {
            return { ready: false, reason: 'no-compile-pending' as const };
          }
          if (snapshot.kind === 'stale-version') {
            return { ready: false, reason: 'stale-version' as const };
          }

          // Await the latch off the serial fiber, bounded by the caller's
          // timeout. A `false` here means the timer won the race.
          const fired = yield* Deferred.await(snapshot.deferred).pipe(
            Effect.as(true),
            Effect.timeoutTo({
              duration: `${req.timeoutMs} millis`,
              onTimeout: () => false,
              onSuccess: () => true,
            }),
          );
          if (!fired) {
            return { ready: false, reason: 'timeout' as const };
          }

          // The latch resolves on a successful merge, on supersession by a newer
          // version, AND on a rejected write-back (armReadiness/clearReadiness/
          // the reject branches). Re-peek with the SAME currency check as the
          // initial peek (symbolsAreCurrent) to tell a real merge from a stale
          // wake-up: a supersession or rejected-write-back wake-up leaves the
          // prior version's table present while the merged version has NOT
          // advanced — reporting ready off that stale table is the bug. When not
          // current, return stale-version so the coordinator re-issues the gate
          // against the newer version.
          const after = yield* dataOwnerRead(
            Effect.gen(function* () {
              const svc = yield* ensureDataOwnerServices;
              const st = yield* Effect.promise(() =>
                svc.symbolManager.getSymbolTableForFile(req.uri),
              );
              return symbolsAreCurrent(req.uri, req.version, st != null);
            }),
          );
          return after
            ? { ready: true }
            : { ready: false, reason: 'stale-version' as const };
        });
      }),
    ),

  UpdateSymbolSubset: (req) =>
    guardRole('UpdateSymbolSubset').pipe(
      Effect.flatMap(() =>
        dataOwnerWrite(
          Effect.gen(function* () {
            writeBackMetrics.attempted++;

            const svc = yield* ensureDataOwnerServices;
            const storage = svc.storageManager.getStorage();
            const cache = getDocumentStateCache();

            // Version validation
            const currentDoc = yield* Effect.promise(() =>
              storage.getDocument(req.uri),
            );

            if (!currentDoc) {
              writeBackMetrics.rejectedDocumentMissing++;
              yield* Effect.annotateCurrentSpan(
                'data_owner.outcome',
                'rejected-document-missing',
              );
              yield* Effect.annotateCurrentSpan(
                symbolStateAttributes({
                  phase: 'enrichment.write_back.reject',
                  uri: req.uri,
                  workerId,
                  workerRole: assignedRole ?? 'unassigned',
                  documentVersion: req.documentVersion,
                  outcome: 'rejected-document-missing',
                }),
              );
              yield* Effect.logDebug(
                `[DATA-OWNER] Write-back rejected: document not found for ${req.uri}`,
              );
              // Terminal for this version: no document means no awaiter can ever
              // be satisfied by it. Release so the coordinator stops waiting and
              // falls back rather than blocking the full gate budget.
              resolveReadiness(req.uri, req.documentVersion);
              return {
                accepted: false,
                merged: 0,
                versionMismatch: false,
              };
            }

            if (currentDoc.version !== req.documentVersion) {
              writeBackMetrics.rejectedVersionMismatch++;
              yield* Effect.annotateCurrentSpan({
                'data_owner.outcome': 'rejected-version-mismatch',
                'document.current_version': currentDoc.version,
                ...symbolStateAttributes({
                  phase: 'enrichment.write_back.reject',
                  uri: req.uri,
                  workerId,
                  workerRole: assignedRole ?? 'unassigned',
                  documentVersion: req.documentVersion,
                  ownerVersion: currentDoc.version,
                  content: currentDoc.getText(),
                  outcome: 'rejected-version-mismatch',
                }),
              });
              yield* Effect.logDebug(
                '[DATA-OWNER] Write-back rejected: version mismatch ' +
                  `(current=${currentDoc.version}, update=${req.documentVersion}) ` +
                  `for ${req.uri} from ${req.sourceWorkerId}`,
              );
              // The compile was for a stale version; the current version's
              // write-back (if any) will resolve its own latch. Release any
              // awaiter for this version so it re-evaluates.
              resolveReadiness(req.uri, req.documentVersion);
              return {
                accepted: false,
                merged: 0,
                versionMismatch: true,
              };
            }

            // Detail level validation
            // When no cache entry exists (file not yet compiled on data-owner),
            // currentOrder is 0 so any write-back level is accepted.
            const currentState = cache.getCurrentState(req.uri);
            const rawLevel = currentState?.detailLevel;
            const currentOrder =
              rawLevel === 'public-api' ||
              rawLevel === 'protected' ||
              rawLevel === 'private' ||
              rawLevel === 'full'
                ? getLayerOrderIndex(rawLevel)
                : 0;
            const enrichedOrder = getLayerOrderIndex(req.enrichedDetailLevel);

            // The detail-level downgrade guard prevents a poorer enrichment from
            // overwriting a richer one — but ONLY for the SAME document version.
            // A write-back for a NEWER version carries fresh content and MUST
            // merge even at an equal/lower detail level: the cached level
            // describes the OLD version's symbols, which are now stale. Guarding
            // on level alone dropped a new version's symbols whenever its compile
            // happened to land at the same level (e.g. public-api after an edit),
            // leaving the graph stuck on the prior version's symbols until some
            // later write-back happened to raise the level. Only skip when the
            // cache is at the same-or-newer version AND same-or-richer level.
            const cachedVersion = currentState?.documentVersion ?? -1;
            const sameOrOlderVersion = req.documentVersion <= cachedVersion;
            if (sameOrOlderVersion && enrichedOrder <= currentOrder) {
              writeBackMetrics.rejectedDetailLevel++;
              yield* Effect.annotateCurrentSpan({
                'data_owner.outcome': 'rejected-detail-level',
                'document.cached_version': cachedVersion,
                'symbol.current_detail_level': rawLevel ?? 'none',
                ...symbolStateAttributes({
                  phase: 'enrichment.write_back.skip',
                  uri: req.uri,
                  workerId,
                  workerRole: assignedRole ?? 'unassigned',
                  documentVersion: req.documentVersion,
                  ownerVersion: currentDoc.version,
                  content: currentDoc.getText(),
                  detailLevel: rawLevel,
                  outcome: 'already-current-or-richer',
                }),
              });
              yield* Effect.logDebug(
                `[DATA-OWNER] Write-back skipped: already have ${rawLevel ?? 'none'} ` +
                  `(order=${currentOrder}) >= ${req.enrichedDetailLevel} ` +
                  `at v${cachedVersion} >= v${req.documentVersion} for ${req.uri}`,
              );
              // Symbols at this (or a richer) level are already in the graph for
              // this (or a newer) version — the awaiter's data IS ready. Release.
              resolveReadiness(req.uri, req.documentVersion);
              return { accepted: false, merged: 0, versionMismatch: false };
            }

            // Deserialize enriched symbol table
            const enrichedSt = yield* Effect.withSpan(
              'dataOwner.update.deserialize',
              { attributes: { 'document.uri': req.uri } },
            )(
              Effect.gen(function* () {
                const { SymbolTable } = yield* Effect.promise(
                  () => import('@salesforce/apex-lsp-parser-ast'),
                );
                return SymbolTable.fromSerializedData(
                  req.enrichedSymbolTable as never,
                );
              }),
            );

            const mergedCount = enrichedSt.getAllSymbols().length;
            const referenceCount = enrichedSt.getAllReferences().length;

            // Merge into symbol manager (returns Effect, so yield directly)
            yield* Effect.withSpan('dataOwner.update.mergeSymbols', {
              attributes: {
                'document.uri': req.uri,
                'document.version': req.documentVersion,
                'symbol.count': mergedCount,
                'reference.count': referenceCount,
              },
            })(
              svc.symbolManager.addSymbolTable(
                enrichedSt,
                req.uri,
                req.documentVersion,
                false, // hasErrors
              ),
            );

            // Populate cross-file incoming edges for this file now that its
            // symbols are merged. During workspace batch load the workspace load
            // session is active and we skip eager full per-file resolution —
            // addSymbolTable already deferred supertype edges to deferredResolutions
            // (drained at session end), and ordinary cross-file refs resolve on-demand
            // via PrerequisiteOrchestrationService. After the workspace load session
            // ends, single-file didOpen/didChange write-backs (session inactive) still
            // resolve eagerly for that one file — bounded, correct interactive behavior.
            if (!svc.symbolManager.isWorkspaceLoadSessionActive()) {
              yield* Effect.withSpan('dataOwner.update.resolveCrossFile', {
                attributes: {
                  'document.uri': req.uri,
                  'reference.count': referenceCount,
                },
              })(svc.symbolManager.resolveCrossFileReferencesForFile(req.uri));
            }

            // Update cache with new detail level
            cache.merge(req.uri, {
              documentVersion: req.documentVersion,
              detailLevel: req.enrichedDetailLevel,
              timestamp: Date.now(),
            });

            writeBackMetrics.accepted++;
            writeBackMetrics.totalSymbolsMerged += mergedCount;

            yield* Effect.annotateCurrentSpan({
              'data_owner.outcome': 'accepted',
              'symbol.count': mergedCount,
              'reference.count': referenceCount,
              ...symbolStateAttributes({
                phase: 'enrichment.write_back.accept',
                uri: req.uri,
                workerId,
                workerRole: assignedRole ?? 'unassigned',
                documentVersion: req.documentVersion,
                ownerVersion: currentDoc.version,
                tableVersion: enrichedSt.getMetadata().documentVersion,
                parseCompleteness: enrichedSt.getMetadata().parseCompleteness,
                content: currentDoc.getText(),
                detailLevel: enrichedSt.getDetailLevel(),
                symbols: enrichedSt.getAllSymbols().map(compactSymbolForState),
                references: enrichedSt
                  .getAllReferences()
                  .map(compactReferenceForState),
                outcome: 'accepted',
              }),
            });

            // Symbols for this version are now in the graph — release any
            // coordinator request awaiting readiness for this URI/version.
            resolveReadiness(req.uri, req.documentVersion);

            // Log to both Effect logger and console for debugging
            const logMsg =
              `[DATA-OWNER] Write-back accepted: ${mergedCount} symbols ` +
              `merged at ${req.enrichedDetailLevel} level for ${req.uri} ` +
              `(from ${req.sourceWorkerId})`;
            console.log(logMsg);
            yield* Effect.logDebug(logMsg);

            return {
              accepted: true,
              merged: mergedCount,
              versionMismatch: false,
            };
          }),
          {
            spanName: 'dataOwner.update.execute',
            attributes: {
              'document.uri': req.uri,
              'document.version': req.documentVersion,
              'symbol.detail_level': req.enrichedDetailLevel,
              'worker.source_id': req.sourceWorkerId,
            },
          },
        ),
      ),
    ),

  FindOccurrenceCandidates: (req) =>
    guardRole('FindOccurrenceCandidates').pipe(
      Effect.flatMap(() =>
        dataOwnerRead(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;
            const all = yield* Effect.promise(() =>
              svc.storageManager.getStorage().getAllDocumentContents(),
            );
            // `skipTextFilter` (renameField) OPTS OUT of the raw-text
            // word-boundary prefilter and returns ALL stored docs. Rename
            // candidate discovery must NOT depend on a raw-text regex prefilter:
            // a false negative would silently drop a file and dangle a reference
            // after the declaration renames. Phase-2 parses every returned doc and
            // declines on any unprovable reference, so widening to "all stored
            // docs" is correct-by-construction. find-references leaves the flag
            // unset and keeps the intentional textMentionsSymbol prefilter.
            let candidates = all;
            if (!req.skipTextFilter) {
              const { textMentionsSymbol } = yield* Effect.promise(
                () => import('@salesforce/apex-lsp-parser-ast'),
              );
              candidates = all.filter((d) =>
                textMentionsSymbol(d.content, req.symbolName),
              );
            }
            emitWorkerLog(
              'info',
              `[REFERENCES] FindOccurrenceCandidates: symbol=${req.symbolName} ` +
                `scanned ${all.length} docs, ${candidates.length} candidates` +
                (req.skipTextFilter ? ' (text prefilter skipped)' : ''),
            );
            return { candidates };
          }),
        ),
      ),
    ),

  CheckMemberConflicts: (req) =>
    guardRole('CheckMemberConflicts').pipe(
      Effect.flatMap(() =>
        dataOwnerRead(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;

            // Guard: descendant/ancestor conflict detection requires the complete
            // inheritance cone, which only exists after endWorkspaceLoadSession
            // resolves supertype edges (ApexSymbolManager.ts:1285-1320). If a
            // session is still active, the graph is incomplete and findSubtypes/
            // findSupertypes will return partial results, risking false negatives.
            if (svc.symbolManager.isWorkspaceLoadSessionActive()) {
              return yield* Effect.fail({
                _tag: 'CheckMemberConflictsError' as const,
                message:
                  'Workspace load session still active; hierarchy graph not yet complete for conflict detection',
              });
            }

            const { SymbolKind, SymbolVisibility, inTypeSymbolGroup } =
              yield* Effect.promise(
                () => import('@salesforce/apex-lsp-parser-ast'),
              );

            // Resolve the defining type by FQN
            const definingType = yield* Effect.promise(() =>
              svc.symbolManager.findSymbolByFQN(req.definingTypeFqn),
            );

            if (!definingType || !inTypeSymbolGroup(definingType)) {
              return yield* Effect.fail({
                _tag: 'CheckMemberConflictsError' as const,
                message: `Type not found or not a type symbol: ${req.definingTypeFqn}`,
              });
            }

            // No-op / case-only rename never conflicts with itself. The same-type
            // lookup cannot exclude the member being renamed, so total→total or
            // total→Total would self-conflict. When the caller supplies the
            // member's current name, short-circuit an identical (case-insensitive)
            // rename to conflict:false — mirrors jorje FieldRenameHandler's
            // short-circuit. Backward-compatible: absent currentName → unchanged.
            if (
              req.currentName &&
              req.newName.toLowerCase() === req.currentName.toLowerCase()
            ) {
              emitWorkerLog(
                'info',
                '[RENAME] CheckMemberConflicts: no-op/case-only rename ' +
                  `${req.definingTypeFqn}.${req.currentName}→${req.newName}, no conflict`,
              );
              return { conflict: false };
            }

            const newNameLower = req.newName.toLowerCase();
            const memberKinds =
              req.memberKind === 'field'
                ? [SymbolKind.Field, SymbolKind.Property]
                : [SymbolKind.Method];

            // Helper: check if a member name matches (case-insensitive)
            const memberNameMatches = (
              memberName: string,
              targetName: string,
            ): boolean => memberName.toLowerCase() === targetName;

            // Helper: check if a symbol is private or default-visibility.
            // In Apex, Default visibility (no access modifier) is effectively
            // private for inheritance purposes — a default-visibility member is
            // NOT visible to subclasses. jorje's !has(PRIVATE) only treats
            // explicitly-visible (public/protected/global) members as conflicting.
            // NOTE: The caller (4.2 renameField) must also treat Default visibility
            // as private when computing isRenamedMemberPrivate for the descendant
            // conflict gate.
            const isPrivate = (symbol: ApexSymbol): boolean =>
              symbol.modifiers.visibility === SymbolVisibility.Private ||
              symbol.modifiers.visibility === SymbolVisibility.Default;

            // Helper: check type for member with newName (as an Effect generator)
            // NOTE: For methods, this does name-based matching only.
            // Signature-equivalence refinement is deferred to WI 5.3 when
            // renameMethod consumes this query with full signature checking.
            const hasMemberNamed = (
              type: ApexSymbol,
              name: string,
              kinds: (typeof SymbolKind)[keyof typeof SymbolKind][],
              excludePrivate: boolean,
            ) =>
              Effect.gen(function* () {
                // Batch-loaded workspace files are served at 'public-api' detail,
                // which DROPS private/protected/default-visibility members from the
                // symbol table entirely (VisibilitySymbolListener never adds them at
                // public-api). All three checks below need non-public members:
                //   - same-type: needs ALL members (incl. private)
                //   - ancestor:  needs protected members present
                //   - descendant: needs ALL members (incl. private/default)
                // So this type's file MUST be at 'full' detail before we read it.
                //
                // FAIL CLOSED (W-23631128 re-review, P1): require the CANONICAL
                // table to be BOTH full-detail AND a KNOWN-complete parse before
                // reading members. Two independent hazards make full-detail alone
                // insufficient:
                //   (1) getDetailLevel() derives from the symbols actually present
                //       (not the stale getDetailLevelForFile() side-channel), so a
                //       newer public-api table that replaced an enriched one is
                //       observed at its true 'public-api' level.
                //   (2) A malformed source still yields a RECOVERED table that
                //       reports 'full' but silently dropped declarations, AND a
                //       full table can arrive from a producer that never
                //       established completeness at the protocol boundary — a raw
                //       cursor recompile written back via UpdateSymbolSubset lands
                //       as full + parseCompleteness='unknown'. `SymbolTable`
                //       defaults completeness to 'unknown', so trusting anything
                //       other than an explicit 'complete' fails OPEN.
                // So we require parseCompleteness === 'complete'. When the table is
                // not full+complete we (re-)enrich from retained source to
                // ESTABLISH completeness (enrichToLevel re-parses a full/unknown
                // table for exactly this reason and stamps 'complete'/'incomplete'
                // from SYNTAX errors — benign SEMANTIC cross-file errors do not
                // drop declarations and do not mark incompleteness, so clean files
                // are not over-declined). If retained source is unavailable, or
                // enrichment cannot reach full+complete (e.g. the source is
                // syntax-broken → 'incomplete'), fail the whole query so the caller
                // preserves uncertainty rather than trusting a truncated set.
                let typeTable = yield* Effect.promise(() =>
                  svc.symbolManager.getSymbolTableForFile(type.fileUri),
                );
                const isFullAndComplete = (
                  t: typeof typeTable | null | undefined,
                ): boolean =>
                  t?.getDetailLevel() === 'full' &&
                  t.getMetadata().parseCompleteness === 'complete';
                if (!isFullAndComplete(typeTable)) {
                  const doc = yield* Effect.promise(() =>
                    svc.storageManager.getStorage().getDocument(type.fileUri),
                  );
                  const text = doc?.getText();
                  if (!text) {
                    return yield* Effect.fail({
                      _tag: 'CheckMemberConflictsError' as const,
                      message:
                        `Cannot verify member conflicts for ${type.fileUri}: ` +
                        'source text unavailable to establish a complete ' +
                        'full-detail parse, so non-public members cannot be ' +
                        'reliably inspected.',
                    });
                  }
                  yield* svc.symbolManager.enrichToLevel(
                    type.fileUri,
                    'full',
                    text,
                  );
                  typeTable = yield* Effect.promise(() =>
                    svc.symbolManager.getSymbolTableForFile(type.fileUri),
                  );
                  if (!isFullAndComplete(typeTable)) {
                    return yield* Effect.fail({
                      _tag: 'CheckMemberConflictsError' as const,
                      message:
                        `Cannot verify member conflicts for ${type.fileUri}: ` +
                        'could not establish a complete full-detail parse ' +
                        '(canonical table at ' +
                        `${typeTable?.getDetailLevel() ?? 'none'} / ` +
                        `${
                          typeTable?.getMetadata().parseCompleteness ??
                          'unknown'
                        }); the member set may be incomplete, so a "no conflict" ` +
                        'result cannot be trusted.',
                    });
                  }
                }

                if (!typeTable) {
                  return yield* Effect.fail({
                    _tag: 'CheckMemberConflictsError' as const,
                    message: `Cannot verify member conflicts: no symbol table for ${type.fileUri}.`,
                  });
                }

                // Members are children of the type's BLOCK scope, not the type itself.
                // Find the block symbol (it's a child of the type with kind === 'block')
                const blockSymbol = typeTable
                  .getSymbolsInScope(type.id)
                  .find((s) => s.kind === SymbolKind.Block);
                if (!blockSymbol) {
                  // No block scope means no members
                  return false;
                }

                const members = typeTable.getSymbolsInScope(blockSymbol.id);
                return members.some((m) => {
                  if (!kinds.includes(m.kind)) return false;
                  if (!memberNameMatches(m.name, name)) return false;
                  if (excludePrivate && isPrivate(m)) return false;
                  return true;
                });
              });

            // 1. Check same-type conflict (no private filter)
            const sameTypeConflict = yield* hasMemberNamed(
              definingType,
              newNameLower,
              memberKinds,
              false,
            );
            if (sameTypeConflict) {
              emitWorkerLog(
                'info',
                `[RENAME] CheckMemberConflicts: conflict in same type ${req.definingTypeFqn}`,
              );
              return {
                conflict: true,
                conflictingTypeFqn: req.definingTypeFqn,
                reason: 'same-type' as const,
              };
            }

            // 2. Check ancestor conflict (exclude private members in ancestors)
            const { ancestors, descendants } = yield* walkTypeFamily(
              svc,
              definingType,
            );

            for (const ancestor of ancestors) {
              const ancestorConflict = yield* hasMemberNamed(
                ancestor,
                newNameLower,
                memberKinds,
                true, // Exclude private members
              );
              if (ancestorConflict) {
                const ancestorFqn =
                  ancestor.fqn ||
                  (yield* Effect.promise(() =>
                    svc.symbolManager.constructFQN(ancestor),
                  ));
                emitWorkerLog(
                  'info',
                  `[RENAME] CheckMemberConflicts: conflict in ancestor ${ancestorFqn}`,
                );
                return {
                  conflict: true,
                  conflictingTypeFqn: ancestorFqn,
                  reason: 'ancestor' as const,
                };
              }
            }

            // 3. Check descendant conflict (only if renamed member is NOT private)
            if (!req.isRenamedMemberPrivate) {
              for (const descendant of descendants) {
                const descendantConflict = yield* hasMemberNamed(
                  descendant,
                  newNameLower,
                  memberKinds,
                  false, // NO private filter on descendant members
                );
                if (descendantConflict) {
                  const descendantFqn =
                    descendant.fqn ||
                    (yield* Effect.promise(() =>
                      svc.symbolManager.constructFQN(descendant),
                    ));
                  emitWorkerLog(
                    'info',
                    `[RENAME] CheckMemberConflicts: conflict in descendant ${descendantFqn}`,
                  );
                  return {
                    conflict: true,
                    conflictingTypeFqn: descendantFqn,
                    reason: 'descendant' as const,
                  };
                }
              }
            }

            // No conflict found
            emitWorkerLog(
              'info',
              `[RENAME] CheckMemberConflicts: no conflict for ${req.definingTypeFqn}.${req.newName}`,
            );
            return { conflict: false };
          }),
        ),
      ),
    ),

  DrainDeferredReferences: (req) =>
    guardRole('DrainDeferredReferences').pipe(
      Effect.flatMap(() =>
        dataOwnerWrite(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;

            // End workspace load session and resolve all deferred files (if sessionId provided)
            let processedCount = 0;
            if (req.sessionId) {
              const sessionId = req.sessionId; // Capture for type narrowing
              processedCount = yield* Effect.promise(() =>
                svc.symbolManager.endWorkspaceLoadSession(sessionId),
              );
              yield* Effect.logInfo(
                `[DATA-OWNER] End workspace load session: ${sessionId}, ` +
                  `resolved=${processedCount} deferred files`,
              );
            }

            // Drain remaining deferred references (legacy behavior)
            const resolved =
              yield* svc.symbolManager.drainAllDeferredReferences();
            yield* Effect.annotateCurrentSpan(
              'reference.resolved_count',
              resolved,
            );
            yield* Effect.logDebug(
              `[DATA-OWNER] DrainDeferredReferences resolved ${resolved} additional edge(s)`,
            );
            return { resolved, processedCount };
          }),
          {
            spanName: 'dataOwner.references.drain',
            attributes: req.sessionId
              ? { 'workspace.session_id': req.sessionId }
              : {},
          },
        ),
      ),
    ),

  InstallSObjectArtifacts: (req) =>
    guardRole('InstallSObjectArtifacts').pipe(
      Effect.flatMap(() =>
        dataOwnerWrite(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;
            let installed = 0;

            for (const artifact of req.artifacts) {
              const ownerUri = ownerUriForSObject(artifact.name);
              const existing = yield* Effect.promise(() =>
                svc.symbolManager.getSymbolTableForFile(ownerUri),
              );
              const version =
                (existing?.getMetadata().documentVersion ?? 0) + 1;
              const table = yield* Effect.try({
                try: () =>
                  composeSObjectSymbolTable(artifact.describe, version),
                catch: (error) => ({
                  _tag: 'InstallSObjectArtifactsError' as const,
                  message:
                    error instanceof Error ? error.message : String(error),
                }),
              });
              yield* svc.symbolManager.addSymbolTable(
                table,
                ownerUri,
                version,
                false,
              );
              installed++;
            }

            if (installed > 0 && req.originUri) {
              yield* svc.symbolManager.resolveCrossFileReferencesForFile(
                req.originUri,
              );
            }

            return { installed };
          }),
        ),
      ),
    ),

  ResolveDepUris: (req) =>
    guardRole('ResolveDepUris').pipe(
      Effect.flatMap(() =>
        dataOwnerRead(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;
            const sm = svc.symbolManager;

            const uris = new Set<string>();
            for (const name of req.classNames) {
              const files = yield* Effect.promise(() =>
                sm.findFilesForSymbol(name),
              );
              for (const f of files) uris.add(f);
            }

            const entries: Record<string, unknown> = {};
            for (const uri of uris) {
              const st = yield* Effect.promise(() =>
                sm.getSymbolTableForFile(uri),
              );
              if (st) {
                // Key the entry by the table's CANONICAL fileUri, not the
                // lookup `uri`. findFilesForSymbol strips the `file://` scheme
                // (returns `/test/X.cls`), so keying by `uri` would make the
                // requesting worker ingest the table under a schemeless URI that
                // never matches its references' `file:///test/X.cls` targets —
                // cross-file edges then fail to bind and find-references on a
                // usage of this type returns []. getFileUri() preserves scheme.
                const canonicalUri = st.getFileUri();
                entries[canonicalUri] = cloneForWire({
                  symbols: st.getAllSymbols(),
                  references: st.getAllReferences(),
                  hierarchicalReferences: st.getAllHierarchicalReferences(),
                  metadata: st.getMetadata(),
                  fileUri: canonicalUri,
                });
              }
            }

            return { entries };
          }),
        ),
      ),
    ),

  DataOwnerQuerySymbolByName: (req) =>
    guardRole('DataOwnerQuerySymbolByName').pipe(
      Effect.flatMap(() =>
        dataOwnerRead(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;
            const sm = svc.symbolManager;

            // Resolve a batch (`names`) or a single name. Batching lets an
            // enrichment worker collapse N per-keystroke blocking round-trips
            // into one. De-dupe so a name repeated across callers is queried
            // once.
            const queryNames = [
              ...new Set(
                (req.names && req.names.length > 0
                  ? req.names
                  : req.name
                    ? [req.name]
                    : []
                ).filter((n): n is string => !!n),
              ),
            ];

            // Optional namespace hint: a qualified reference (`MyNs.Foo`)
            // carries its leading qualifier so the data-owner can disambiguate
            // same-named matches across namespaces. Applied as a SOFT
            // preference, not a hard filter — if no symbol's namespace matches
            // the hint, fall back to all matches. This keeps inner-class
            // qualifiers (`Outer.Inner`, where `Outer` is a type, not a
            // namespace) working: nothing matches the hint, so all candidates
            // are returned as before.
            const nsHint = req.namespace?.toLowerCase();
            const symbolNamespace = (s: {
              namespace?: unknown;
            }): string | undefined => {
              const ns = s.namespace;
              if (!ns) return undefined;
              return (typeof ns === 'string' ? ns : String(ns)).toLowerCase();
            };

            const matches: Array<{
              name: string;
              fileUri: string;
              kind?: string;
            }> = [];
            const uris = new Set<string>();
            for (const queryName of queryNames) {
              // The data-owner holds ALL workspace symbols, so its name index
              // resolves names an enrichment worker's local subset may miss.
              const symbols = yield* Effect.promise(() =>
                sm.findSymbolByName(queryName),
              );
              const withFile = symbols.filter((s) => !!s?.fileUri);
              // Prefer the namespace-matched subset when the hint actually
              // matches something; otherwise keep every candidate.
              const nsMatched = nsHint
                ? withFile.filter((s) => symbolNamespace(s) === nsHint)
                : [];
              const selected = nsMatched.length > 0 ? nsMatched : withFile;
              for (const symbol of selected) {
                matches.push({
                  name: symbol.name,
                  fileUri: symbol.fileUri!,
                  kind:
                    typeof symbol.kind === 'string' ? symbol.kind : undefined,
                });
                uris.add(symbol.fileUri!);
              }
            }

            // Return the owning files' symbol tables so the worker can ingest
            // them and finish resolving the reference (mirrors ResolveDepUris).
            const entries: Record<string, unknown> = {};
            for (const uri of uris) {
              const st = yield* Effect.promise(() =>
                sm.getSymbolTableForFile(uri),
              );
              if (st) {
                entries[uri] = cloneForWire({
                  symbols: st.getAllSymbols(),
                  references: st.getAllReferences(),
                  hierarchicalReferences: st.getAllHierarchicalReferences(),
                  metadata: st.getMetadata(),
                  fileUri: st.getFileUri(),
                });
              }
            }

            return { matches, entries };
          }),
        ),
      ),
    ),

  ResolveDependentUris: (req) =>
    guardRole('ResolveDependentUris').pipe(
      Effect.flatMap(() =>
        dataOwnerRead(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;
            const { resolveDependentUris } = yield* Effect.promise(
              () => import('@salesforce/apex-lsp-parser-ast'),
            );
            const result = yield* Effect.promise(() =>
              resolveDependentUris(svc.symbolManager, req.uri, req.symbolName),
            );
            const wire: Record<string, unknown> = {};
            for (const [uri, entry] of Object.entries(result.entries)) {
              // cloneForWire (JSON round-trip) drops the class identity and
              // any non-enumerable/getter props on the symbol-table objects
              // so the result is a plain tree that survives structured-clone
              // across the worker postMessage boundary.
              wire[uri] = cloneForWire(entry);
            }
            return { entries: wire };
          }),
        ),
      ),
    ),

  BeginWorkspaceLoadSession: (req) =>
    guardRole('BeginWorkspaceLoadSession').pipe(
      Effect.flatMap(() =>
        dataOwnerWrite(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;
            svc.symbolManager.beginWorkspaceLoadSession(req.sessionId);
            yield* Effect.logInfo(
              `[DATA-OWNER] Begin workspace load session: ${req.sessionId}`,
            );
            return { ok: true as const };
          }),
        ),
      ),
    ),

  WorkspaceBatchCompileOnDataOwner: (req) =>
    guardRole('WorkspaceBatchCompileOnDataOwner').pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const pool = yield* CompilationWorkerPool;
          if (!pool.available) {
            return yield* Effect.fail(
              new Error(
                'Workspace compilation requires the data-owner-managed compilation pool',
              ),
            );
          }

          yield* Effect.logInfo(
            '[DATA-OWNER] WorkspaceBatchCompileOnDataOwner received: ' +
              `${req.entries.length} files, poolSize=${pool.size}, ` +
              `workerConcurrency=${pool.concurrency}`,
          );
          const batchStartTime = Date.now();
          const svc = yield* ensureDataOwnerServices;
          // CPU parallelism comes from distinct Effect Workers. The worker's
          // own Effect concurrency controls request scheduling, not additional
          // CPU execution within that worker. Keeping workspace admission at
          // one request per backing worker also avoids preloading the Effect
          // pool's FIFO lease queue: an interactive request that arrives while
          // all workers are busy waits ahead of the next, not-yet-submitted
          // workspace file.
          const compilationParallelism = Math.max(1, pool.size);
          const resultBufferCapacity = Math.max(1, pool.size * 4);

          yield* Effect.annotateCurrentSpan({
            'workspace.session_id': req.sessionId,
            'workspace.file_count': req.entries.length,
            'workspace.content_chars': req.entries.reduce(
              (total, entry) => total + entry.content.length,
              0,
            ),
            'workspace.worker_count': pool.size,
            'workspace.concurrency_per_worker': pool.concurrency,
            'workspace.compile_parallelism': compilationParallelism,
            'workspace.result_buffer_capacity': resultBufferCapacity,
            'workspace.compile_location': 'data-owner-effect-worker-pool',
          });

          const pipeline = yield* runWorkspaceCompilationPipeline({
            entries: req.entries,
            parallelism: compilationParallelism,
            bufferCapacity: resultBufferCapacity,
            compile: (entry) =>
              pool.execute(
                new CompileApexFile({
                  uri: entry.uri,
                  content: entry.content,
                  languageId: entry.languageId,
                  version: entry.version,
                  detailLevel: 'public-api',
                  collectReferences: true,
                  traceContext: req.traceContext,
                }),
                'low',
              ),
            commit: (compiled, entry, index) =>
              dataOwnerWrite(
                Effect.gen(function* () {
                  const storage = svc.storageManager.getStorage();
                  const currentDocument = yield* Effect.promise(() =>
                    storage.getDocument(entry.uri),
                  );
                  if (
                    !currentDocument ||
                    currentDocument.version !== entry.version
                  ) {
                    yield* Effect.annotateCurrentSpan({
                      'workspace.merge_outcome': !currentDocument
                        ? 'rejected-document-missing'
                        : 'rejected-version-mismatch',
                      'document.current_version':
                        currentDocument?.version ?? -1,
                    });
                    resolveReadiness(entry.uri, entry.version);
                    return { outcome: 'rejected' as const };
                  }

                  const deserializeStart = Date.now();
                  const symbolTable = reconstructCompiledSymbolTable(compiled);
                  const deserializeMs = Date.now() - deserializeStart;

                  const mergeStart = Date.now();
                  yield* svc.symbolManager.addSymbolTable(
                    symbolTable,
                    entry.uri,
                    entry.version,
                    compiled.parserDiagnostics.length > 0,
                  );
                  const mergeMs = Date.now() - mergeStart;
                  getDocumentStateCache().merge(entry.uri, {
                    documentVersion: entry.version,
                    detailLevel: 'public-api',
                    timestamp: Date.now(),
                  });
                  resolveReadiness(entry.uri, entry.version);

                  yield* Effect.annotateCurrentSpan({
                    'workspace.compile_ms': compiled.metrics.compileMs,
                    'workspace.serialize_ms': compiled.metrics.serializeMs,
                    'workspace.payload_size_bytes':
                      compiled.metrics.payloadSizeBytes,
                    'workspace.deserialize_ms': deserializeMs,
                    'workspace.merge_ms': mergeMs,
                    'workspace.merge_outcome': 'compiled',
                    'symbol.count': compiled.metrics.symbolCount,
                    'reference.count': compiled.metrics.referenceCount,
                  });
                  return { outcome: 'compiled' as const };
                }),
                {
                  spanName: 'workspace.file.commit',
                  attributes: {
                    'workspace.session_id': req.sessionId,
                    'workspace.file_index': index,
                    'workspace.file_total': req.entries.length,
                    'document.uri': entry.uri,
                    'document.version': entry.version,
                  },
                },
              ),
          });

          for (const failure of pipeline.failures) {
            resolveReadiness(failure.entry.uri, failure.entry.version);
            yield* Effect.logWarning(
              `[DATA-OWNER] Workspace compilation failed for ${failure.entry.uri}: ` +
                Cause.pretty(failure.cause),
            );
          }

          const compiledCount = pipeline.results.filter(
            (result) => result.outcome === 'compiled',
          ).length;
          const errorCount = req.entries.length - compiledCount;
          const elapsedMs = Date.now() - batchStartTime;

          yield* Effect.annotateCurrentSpan({
            'workspace.compiled_count': compiledCount,
            'workspace.error_count': errorCount,
            'workspace.elapsed_ms': elapsedMs,
          });
          yield* Effect.logInfo(
            `[DATA-OWNER] Effect Worker batch compile: ${compiledCount} compiled, ` +
              `${errorCount} errors, ${elapsedMs}ms (${pool.size} workers)`,
          );

          return {
            compiledCount,
            errorCount,
            elapsedMs,
            workerCount: pool.size,
          };
        }).pipe(
          Effect.mapError((error) => ({
            _tag: 'WorkspaceBatchCompileOnDataOwnerError' as const,
            message: error instanceof Error ? error.message : String(error),
          })),
        ),
      ),
    ),

  WorkspaceBatchIngest: (req) =>
    guardRole('WorkspaceBatchIngest').pipe(
      Effect.flatMap(() =>
        dataOwnerWrite(
          Effect.gen(function* () {
            const startTime = Date.now();
            const svc = yield* ensureDataOwnerServices;

            const storage = svc.storageManager.getStorage();
            for (const entry of req.entries) {
              const doc: WorkerDocument = {
                uri: entry.uri,
                getText: () => entry.content,
                languageId: entry.languageId,
                version: entry.version,
              };
              // Keep the ingest span open until storage has accepted the
              // document. Besides making the timing honest, this guarantees
              // the compilation worker's subsequent write-back cannot race a
              // still-pending document store and be rejected as missing.
              yield* Effect.promise(() =>
                storage.setDocument(entry.uri, doc as never),
              );
            }
            const elapsed = Date.now() - startTime;
            yield* Effect.annotateCurrentSpan(
              'workspace.ingest_elapsed_ms',
              elapsed,
            );
            const stats = (yield* Effect.promise(
              () =>
                (svc.symbolManager as any).getStats?.() ??
                Promise.resolve(null),
            )) as {
              totalFiles: number;
              totalSymbols: number;
              totalReferences: number;
            } | null;
            const statsStr = stats
              ? ` | graph: ${stats.totalFiles} files, ${stats.totalSymbols} symbols, ${stats.totalReferences} refs`
              : '';
            yield* Effect.logDebug(
              `[DATA-OWNER] WorkspaceBatchIngest: session=${req.sessionId}, ` +
                `stored=${req.entries.length} files in ${elapsed}ms${statsStr}`,
            );
            return { processedCount: req.entries.length };
          }),
          {
            spanName: 'dataOwner.batch.ingest',
            attributes: {
              'workspace.session_id': req.sessionId,
              'workspace.file_count': req.entries.length,
              'workspace.content_chars': req.entries.reduce(
                (total, entry) => total + entry.content.length,
                0,
              ),
            },
          },
        ),
      ),
    ),

  QueryGraphData: (req) =>
    guardRole('QueryGraphData').pipe(
      Effect.flatMap(() =>
        dataOwnerRead(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;
            const { GraphDataProcessingService } = yield* Effect.promise(
              () => import('@salesforce/apex-lsp-compliant-services'),
            );
            const service = new GraphDataProcessingService(
              getLogger(),
              svc.symbolManager,
            );
            const result = yield* Effect.promise(() =>
              service.processGraphData({
                type: req.type,
                fileUri: req.fileUri,
                symbolType: req.symbolType,
                includeMetadata: req.includeMetadata ?? false,
                includeDiagnostics: req.includeDiagnostics ?? false,
              }),
            );
            return cloneForWire(result);
          }),
        ),
      ),
    ),

  DispatchDocumentOpen: dataOwnerDocHandler(
    'DispatchDocumentOpen',
    (svc, req) =>
      Effect.gen(function* () {
        const doc: WorkerDocument = {
          uri: req.uri,
          getText: () => req.content,
          languageId: req.languageId,
          version: req.version,
        };
        // Await the store: the write-back's version check (UpdateSymbolSubset)
        // and the readiness latch both require the document to be present at
        // this version BEFORE the compile this open triggers runs. The prior
        // `void` left that a race — a fast compile could write back before the
        // store landed and be rejected as "document not found".
        yield* Effect.promise(() =>
          svc.storageManager.getStorage().setDocument(req.uri, doc as never),
        );
        // Arm before returning: dispatch() sequences this store ahead of the
        // compile, so the latch exists when a fast-following documentSymbol
        // awaits it.
        armReadiness(req.uri, req.version);
        yield* Effect.annotateCurrentSpan(
          symbolStateAttributes({
            phase: 'document.open.store',
            uri: req.uri,
            workerId,
            workerRole: assignedRole ?? 'unassigned',
            documentVersion: req.version,
            ownerVersion: req.version,
            content: req.content,
            outcome: 'stored-and-armed',
          }),
        );
        return { accepted: true };
      }),
  ),

  DispatchDocumentChange: dataOwnerDocHandler(
    'DispatchDocumentChange',
    (svc, req) =>
      Effect.gen(function* () {
        const doc: WorkerDocument = {
          uri: req.uri,
          getText: () => req.content,
          languageId: 'apex',
          version: req.version,
        };
        yield* Effect.promise(() =>
          svc.storageManager.getStorage().setDocument(req.uri, doc as never),
        );
        // Re-arm at the new version; supersedes the prior latch so an awaiter
        // for the old version stops waiting and re-evaluates.
        armReadiness(req.uri, req.version);
        yield* Effect.annotateCurrentSpan(
          symbolStateAttributes({
            phase: 'document.change.store',
            uri: req.uri,
            workerId,
            workerRole: assignedRole ?? 'unassigned',
            documentVersion: req.version,
            ownerVersion: req.version,
            content: req.content,
            outcome: 'stored-and-armed',
          }),
        );
        return { accepted: true };
      }),
  ),

  DispatchDocumentSave: dataOwnerDocHandler(
    'DispatchDocumentSave',
    (svc, req) =>
      Effect.gen(function* () {
        // Mirror DispatchDocumentChange: persist the authoritative saved text
        // before compilation and arm readiness at this version.
        const doc: WorkerDocument = {
          uri: req.uri,
          getText: () => req.content,
          languageId: 'apex',
          version: req.version,
        };
        yield* Effect.promise(() =>
          svc.storageManager.getStorage().setDocument(req.uri, doc as never),
        );
        armReadiness(req.uri, req.version);
        return { accepted: true };
      }),
  ),

  DispatchDocumentClose: dataOwnerDocHandler(
    'DispatchDocumentClose',
    (svc, req) =>
      Effect.sync(() => {
        const closeDoc: WorkerDocument = {
          uri: req.uri,
          getText: () => '',
          languageId: 'apex',
          version: 0,
        };
        svc.documentCloseProcessingService.processDocumentClose({
          document: closeDoc as never,
        });
        // Release any awaiter and drop the latch so the Map doesn't grow
        // unbounded across a long session of opens/closes.
        clearReadiness(req.uri);
        clearSymbolStateForUri(req.uri);
        return { accepted: true };
      }),
  ),

  // -- Interactive compilation via the data-owner-managed Effect Worker pool ---

  CompileDocument: (req) =>
    guardRole('CompileDocument').pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const startTime = Date.now();
          const pool = yield* CompilationWorkerPool;
          if (!pool.available) {
            return yield* Effect.fail(
              new Error(
                'Interactive compilation requires the data-owner-managed compilation pool',
              ),
            );
          }

          const compiled = yield* pool.execute(
            new CompileApexFile({
              uri: req.uri,
              content: req.content,
              languageId: req.languageId,
              version: req.version,
              detailLevel: 'public-api',
              collectReferences: true,
              traceContext: req.traceContext,
            }),
            req.priority,
          );

          const compiledCount = yield* dataOwnerWrite(
            Effect.gen(function* () {
              const svc = yield* ensureDataOwnerServices;
              const storage = svc.storageManager.getStorage();
              const currentDocument = yield* Effect.promise(() =>
                storage.getDocument(req.uri),
              );
              if (!currentDocument || currentDocument.version !== req.version) {
                resolveReadiness(req.uri, req.version);
                yield* Effect.annotateCurrentSpan({
                  'interactive.compile_outcome': !currentDocument
                    ? 'rejected-document-missing'
                    : 'rejected-version-mismatch',
                  'document.current_version': currentDocument?.version ?? -1,
                  ...symbolStateAttributes({
                    phase: 'interactive.compile.reject',
                    uri: req.uri,
                    workerId,
                    workerRole: assignedRole ?? 'unassigned',
                    documentVersion: req.version,
                    ownerVersion: currentDocument?.version,
                    content: req.content,
                    outcome: !currentDocument
                      ? 'rejected-document-missing'
                      : 'rejected-version-mismatch',
                  }),
                });
                return 0;
              }

              const symbolTable = yield* Effect.withSpan(
                'interactive.compile.deserialize',
                { attributes: { 'document.uri': req.uri } },
              )(Effect.sync(() => reconstructCompiledSymbolTable(compiled)));

              yield* Effect.withSpan('interactive.compile.addSymbolTable', {
                attributes: {
                  'document.uri': req.uri,
                  'symbol.count': compiled.metrics.symbolCount,
                  'reference.count': compiled.metrics.referenceCount,
                },
              })(
                svc.symbolManager.addSymbolTable(
                  symbolTable,
                  req.uri,
                  req.version,
                  compiled.parserDiagnostics.length > 0,
                ),
              );

              const workspaceLoadSessionActive =
                svc.symbolManager.isWorkspaceLoadSessionActive();
              if (!workspaceLoadSessionActive) {
                yield* Effect.withSpan('interactive.compile.resolveCrossFile', {
                  attributes: {
                    'document.uri': req.uri,
                    'reference.count': compiled.metrics.referenceCount,
                  },
                })(
                  svc.symbolManager.resolveCrossFileReferencesForFile(req.uri),
                );
              }
              yield* Effect.withSpan('interactive.compile.finalize')(
                Effect.sync(() => {
                  getDocumentStateCache().merge(req.uri, {
                    documentVersion: req.version,
                    detailLevel: 'public-api',
                    timestamp: Date.now(),
                  });
                  resolveReadiness(req.uri, req.version);
                }),
              );
              yield* Effect.annotateCurrentSpan({
                'interactive.compile_outcome': 'compiled',
                'interactive.cross_file_resolution_skipped':
                  workspaceLoadSessionActive,
                'interactive.compile_ms': compiled.metrics.compileMs,
                'interactive.serialize_ms': compiled.metrics.serializeMs,
                'interactive.payload_size_bytes':
                  compiled.metrics.payloadSizeBytes,
                'symbol.count': compiled.metrics.symbolCount,
                'reference.count': compiled.metrics.referenceCount,
                ...symbolStateAttributes({
                  phase: 'interactive.compile.commit',
                  uri: req.uri,
                  workerId,
                  workerRole: assignedRole ?? 'unassigned',
                  documentVersion: req.version,
                  ownerVersion: req.version,
                  tableVersion: symbolTable.getMetadata().documentVersion,
                  parseCompleteness:
                    symbolTable.getMetadata().parseCompleteness,
                  content: req.content,
                  detailLevel: symbolTable.getDetailLevel(),
                  symbols: symbolTable
                    .getAllSymbols()
                    .map(compactSymbolForState),
                  references: symbolTable
                    .getAllReferences()
                    .map(compactReferenceForState),
                  outcome: 'accepted',
                }),
              });
              return 1;
            }),
            {
              spanName: 'interactive.compile.commit',
              attributes: {
                'document.uri': req.uri,
                'document.version': req.version,
                'interactive.priority': req.priority,
              },
            },
          );
          const elapsedMs = Date.now() - startTime;
          yield* Effect.logDebug(
            `[DATA-OWNER] CompileDocument via persistent pool: ${req.uri} (v${req.version}, ` +
              `priority=${req.priority}, ${elapsedMs}ms)`,
          );
          return { compiledCount, elapsedMs };
        }).pipe(
          Effect.tapError(() =>
            dataOwnerWrite(
              Effect.sync(() => resolveReadiness(req.uri, req.version)),
            ),
          ),
          Effect.mapError((error) => ({
            _tag: 'CompileDocumentError' as const,
            message: error instanceof Error ? error.message : String(error),
          })),
        ),
      ),
    ),

  // -- Enrichment/search pool handlers (Step 11) ----------------------------
  //
  // All enrichment handlers follow the same pattern: guard role, bootstrap
  // services, call the service method, clone the result for postMessage.
  // The `requestHandler` factory eliminates the repetition.

  ...requestHandlers,

  DispatchGenericLspRequest: (req) =>
    guardRole('DispatchGenericLspRequest').pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          yield* Effect.logWarning(
            `[ENRICHMENT] GenericLspRequest: unhandled type=${req.requestType}`,
          );
          return { result: null };
        }),
      ),
    ),

  // -- Resource-loader handlers (Step 9) -------------------------------------

  ResourceLoaderGetSymbolTable: (req) =>
    guardRole('ResourceLoaderGetSymbolTable').pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const { ResourceLoader } = yield* Effect.promise(
            () => import('@salesforce/apex-lsp-parser-ast'),
          );
          const st = yield* Effect.promise(() =>
            ResourceLoader.getInstance().getSymbolTable(req.classPath),
          );
          if (!st) return { found: false };
          return { found: true, symbolTable: cloneForWire(st) };
        }),
      ),
    ),

  ResourceLoaderGetSymbolTables: (req) =>
    guardRole('ResourceLoaderGetSymbolTables').pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const { ResourceLoader } = yield* Effect.promise(
            () => import('@salesforce/apex-lsp-parser-ast'),
          );
          const loader = ResourceLoader.getInstance();
          const entries: Record<string, unknown> = {};
          for (const classPath of req.classPaths) {
            const symbolTable = yield* Effect.promise(() =>
              loader.getSymbolTable(classPath),
            );
            if (symbolTable) {
              entries[classPath] = cloneForWire(symbolTable);
            }
          }
          return { entries };
        }),
      ),
    ),

  ResourceLoaderGetFile: (req) =>
    guardRole('ResourceLoaderGetFile').pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const { ResourceLoader } = yield* Effect.promise(
            () => import('@salesforce/apex-lsp-parser-ast'),
          );
          const content = yield* Effect.promise(() =>
            ResourceLoader.getInstance().getFile(req.path),
          );
          return content !== undefined
            ? { found: true, content }
            : { found: false };
        }),
      ),
    ),

  ResourceLoaderResolveClass: (req) =>
    guardRole('ResourceLoaderResolveClass').pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const { ResourceLoader } = yield* Effect.promise(
            () => import('@salesforce/apex-lsp-parser-ast'),
          );
          const fqn = ResourceLoader.getInstance().resolveStandardClassFqn(
            req.className,
          );
          return fqn !== null ? { found: true, fqn } : { found: false };
        }),
      ),
    ),

  ResourceLoaderGetStandardNamespaces: () =>
    guardRole('ResourceLoaderGetStandardNamespaces').pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const { ResourceLoader } = yield* Effect.promise(
            () => import('@salesforce/apex-lsp-parser-ast'),
          );
          const raw = ResourceLoader.getInstance().getStandardNamespaces();
          const namespaces: Record<string, string[]> = {};
          for (const [k, v] of raw) {
            namespaces[k] = v.map((cis) =>
              typeof cis === 'string' ? cis : (cis as { value: string }).value,
            );
          }
          return { namespaces };
        }),
      ),
    ),
};

/**
 * Every decoded coordinator request enters through this table. Wrap the whole
 * table once so data-owner, compilation, resource-loader, and request-pool
 * workers all extract and use the same parent-context contract.
 */
export const handlers = Object.fromEntries(
  Object.entries(untracedHandlers).map(([tag, untypedHandler]) => {
    const handler = untypedHandler as unknown as UntypedWorkerHandler;
    return [
      tag,
      (request: unknown) =>
        withWorkerRequestTracing(
          tag,
          request as { readonly traceContext?: string },
          handler(request as never),
        ),
    ];
  }),
) as unknown as SerializedWorkerHandlers;
