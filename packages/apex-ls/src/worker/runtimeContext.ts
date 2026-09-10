/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Worker runtime context: the mutable process-global singletons and the
 * platform DI shims that worker.platform.shared.ts depends on.
 *
 * This module sits at the BOTTOM of the worker dependency graph — it imports
 * nothing from its siblings, so every other extracted module (and the
 * composition root) may import it freely without creating a cycle.
 *
 * The exported `let` bindings are intentional live bindings: each platform
 * shell (worker.platform.ts / worker.platform.web.ts) calls the matching
 * `set*` mutator once at module load, and readers observe the updated value
 * through the ES-module live binding. Reads happen inside request handlers,
 * well after both shells finish loading, so call order is never a hazard.
 *
 * Imported with an explicit .ts extension for the same reason as the parent
 * module: integration tests spawn the worker entry files via tsx, which
 * cannot resolve bare relative specifiers in a worker_threads subprocess.
 */

import { Effect, LogLevel } from 'effect';
import {
  isAllowedTag,
  type WorkerRole,
  type WorkerLogLevel,
} from '@salesforce/apex-lsp-shared';

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
// order relative to the shared module's own top-level Effect.cached(...)
// blocks, because Effect.cached defers the wrapped generator's body until
// the first time something actually runs the cached Effect — which only
// happens inside a request handler, well after both modules finish loading.
// ---------------------------------------------------------------------------

export type AssistanceTransport = (
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

export type WorkerTracingHooks = {
  readonly initialize: (url: string, serviceName: string) => void;
  readonly provide: <A, E, R>(
    effect: Effect.Effect<A, E, R>,
  ) => Effect.Effect<A, E, R>;
  readonly withParent: <A, E>(
    request: { readonly traceContext?: string },
    effect: Effect.Effect<A, E, never>,
  ) => Effect.Effect<A, E, never>;
};

export let workerTracingHooks: WorkerTracingHooks = {
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

export type ResourceLoaderLayerFactory = () => Promise<unknown>;

let _makeResourceLoaderRemoteLayer: ResourceLoaderLayerFactory = () => {
  throw new Error('resource loader layer factory not initialized');
};

export function setResourceLoaderLayerFactory(
  fn: ResourceLoaderLayerFactory,
): void {
  _makeResourceLoaderRemoteLayer = fn;
}

export function makeResourceLoaderRemoteLayer(): Promise<unknown> {
  return _makeResourceLoaderRemoteLayer();
}

// 5th DI shim, not enumerated in the plan's 4-hook DI-boundary list: the
// WorkerRemoteStdlibWarmup handler calls warmRemoteStdlibNamespaceCache(),
// whose Node/Web bodies are structurally different (Node throws if the
// namespace map isn't initialized; Web swallows errors and has a
// differently-shaped response payload) and so stay in each platform shell,
// same rationale as makeResourceLoaderRemoteLayer.
export type WarmRemoteStdlibNamespaceCache = () => Promise<void>;

let _warmRemoteStdlibNamespaceCache: WarmRemoteStdlibNamespaceCache = () => {
  throw new Error('remote stdlib namespace warmup not initialized');
};

export function setWarmRemoteStdlibNamespaceCache(
  fn: WarmRemoteStdlibNamespaceCache,
): void {
  _warmRemoteStdlibNamespaceCache = fn;
}

export function warmRemoteStdlibNamespaceCacheShared(): Promise<void> {
  return _warmRemoteStdlibNamespaceCache();
}
