/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Shared performance measurement utilities for testing and production observability.
 *
 * These utilities work in both Node.js and browser environments (including web workers)
 * and provide consistent performance measurement and blocking detection across all packages.
 *
 * **Key features:**
 * - Environment detection (Node.js, browser, web worker)
 * - CPU blocking detection with environment-aware thresholds
 * - Performance.now() based timing (works everywhere)
 * - Browser Performance API integration for marking/measuring
 * - **Optional Effect metrics integration for production observability**
 *
 * **Test-time usage** (simple measurements):
 * ```typescript
 * import { measureTime, measureSyncBlocking } from '@salesforce/apex-lsp-shared';
 *
 * // Measure async operation
 * const { result, avgTimeMs } = await measureTime(() => someAsyncOp());
 *
 * // Measure sync operation with blocking detection
 * const { result, isBlocking } = measureSyncBlocking('compile', () => compile());
 * ```
 *
 * **Production usage** (with Effect metrics):
 * ```typescript
 * import { enableMetrics, measureSyncBlocking } from '@salesforce/apex-lsp-shared';
 * import { Effect } from 'effect';
 *
 * // Enable Effect metrics integration
 * enableMetrics(Effect);
 *
 * // Measurements will now emit metrics automatically
 * const result = measureSyncBlocking('compile', () => compile(code));
 * // Metrics: apex.compile.duration, apex.eventloop.blocking
 * ```
 */

import {
  initializeMetrics,
  recordDuration,
  recordBlocking,
  PERFORMANCE_METRICS,
} from './performance-metrics';

/**
 * Execution environment type
 */
export type ExecutionEnvironment = 'node' | 'browser' | 'worker';

/**
 * Enable Effect metrics integration
 *
 * Call this once at app startup to enable automatic metrics emission
 * for all performance measurements.
 *
 * @param Effect The Effect module (import from 'effect')
 *
 * @example
 * ```typescript
 * import { Effect } from 'effect';
 * import { enableMetrics } from '@salesforce/apex-lsp-shared';
 *
 * // Enable at app startup
 * enableMetrics(Effect);
 * ```
 */
export function enableMetrics(Effect: any): void {
  initializeMetrics(Effect);
}

/**
 * Result from measuring execution time
 */
export interface TimingResult<T> {
  result: T;
  avgTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
}

/**
 * Result from measuring with blocking detection
 */
export interface BlockingTimingResult<T> {
  result: T;
  durationMs: number;
  isBlocking: boolean;
  isSync: boolean;
  timestamp: number;
  environment: ExecutionEnvironment;
  phase?: string;
}

/**
 * Detect the current execution environment
 *
 * @returns 'worker' if in web worker, 'browser' if in browser main thread, 'node' if in Node.js
 */
export function getEnvironment(): ExecutionEnvironment {
  // Check for web worker first (most specific)
  // Workers have 'self' but no 'window' or 'document'
  if (
    typeof self !== 'undefined' &&
    typeof window === 'undefined' &&
    typeof document === 'undefined' &&
    // Check for worker-specific global
    typeof (globalThis as any).importScripts !== 'undefined'
  ) {
    return 'worker';
  }

  // Check for browser main thread
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return 'browser';
  }

  // Default to Node.js
  return 'node';
}

/**
 * Get the blocking threshold for the current environment
 *
 * Different environments have different acceptable blocking times:
 * - Browser main thread: 16ms (60fps)
 * - Web worker: 100ms (can block longer without freezing UI)
 * - Node.js: 100ms (event loop responsiveness)
 *
 * @param env Optional environment (detects automatically if not provided)
 * @returns Threshold in milliseconds
 */
export function getBlockingThreshold(
  env: ExecutionEnvironment = getEnvironment(),
): number {
  switch (env) {
    case 'browser':
      return 16; // 60fps on main thread
    case 'worker':
      return 100; // Worker can block longer
    case 'node':
      return 100; // Node.js event loop
  }
}

/**
 * Measure execution time of an async function over multiple iterations
 *
 * Uses performance.now() which works in both Node.js and browser.
 *
 * @param fn Async function to measure
 * @param iterations Number of times to run (default: 1)
 * @returns Promise with timing results
 *
 * @example
 * ```typescript
 * const { result, avgTimeMs, minTimeMs, maxTimeMs } = await measureTime(
 *   async () => await compile(code),
 *   3 // run 3 times
 * );
 * console.log(`Average: ${avgTimeMs}ms, Min: ${minTimeMs}ms, Max: ${maxTimeMs}ms`);
 * ```
 */
export async function measureTime<T>(
  fn: () => Promise<T>,
  iterations: number = 1,
): Promise<TimingResult<T>> {
  const times: number[] = [];
  let result!: T;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    result = await fn();
    const end = performance.now();
    times.push(end - start);
  }

  const avgTimeMs = times.reduce((a, b) => a + b, 0) / times.length;
  const minTimeMs = Math.min(...times);
  const maxTimeMs = Math.max(...times);

  return { result, avgTimeMs, minTimeMs, maxTimeMs };
}

/**
 * Measure execution time of a synchronous function with blocking detection
 *
 * Detects if the operation blocks the event loop based on environment-specific thresholds.
 *
 * **Automatic metrics**: If Effect metrics are enabled, automatically emits:
 * - Duration histogram for the operation
 * - Blocking counter if threshold exceeded
 *
 * @param operation Name of the operation (for logging/debugging and metrics)
 * @param fn Synchronous function to measure
 * @param customThreshold Optional custom blocking threshold in ms
 * @returns Result with timing and blocking detection
 *
 * @example
 * ```typescript
 * const { result, durationMs, isBlocking } = measureSyncBlocking(
 *   'parse-tree',
 *   () => parser.parse(code)
 * );
 * if (isBlocking) {
 *   console.warn(`Operation blocked for ${durationMs}ms!`);
 * }
 * ```
 */
export function measureSyncBlocking<T>(
  operation: string,
  fn: () => T,
  customThreshold?: number,
): BlockingTimingResult<T> {
  const env = getEnvironment();
  const threshold = customThreshold ?? getBlockingThreshold(env);
  const timestamp = performance.now();

  const start = performance.now();
  const result = fn();
  const end = performance.now();

  const durationMs = end - start;
  const isBlocking = durationMs > threshold;

  // Emit metrics if enabled
  const metricName = getMetricNameForOperation(operation);
  if (metricName) {
    recordDuration(metricName, durationMs, {
      operation,
      environment: env,
      isBlocking,
    });
  }

  // Record blocking event if threshold exceeded
  if (isBlocking) {
    recordBlocking(operation, durationMs, threshold);
  }

  return {
    result,
    durationMs,
    isBlocking,
    isSync: true,
    timestamp,
    environment: env,
    phase: operation,
  };
}

/**
 * Measure execution time of an async function with blocking detection
 *
 * Note: For async functions, "blocking" is detected based on total time,
 * but the function may yield control to the event loop during execution.
 *
 * @param operation Name of the operation (for logging/debugging)
 * @param fn Async function to measure
 * @param customThreshold Optional custom blocking threshold in ms
 * @returns Promise with result and timing/blocking detection
 *
 * @example
 * ```typescript
 * const { result, durationMs, isBlocking } = await measureAsyncBlocking(
 *   'resolve-member',
 *   async () => await manager.resolveMemberInContext(...)
 * );
 * ```
 */
export async function measureAsyncBlocking<T>(
  operation: string,
  fn: () => Promise<T>,
  customThreshold?: number,
): Promise<BlockingTimingResult<T>> {
  const env = getEnvironment();
  const threshold = customThreshold ?? getBlockingThreshold(env);
  const timestamp = performance.now();

  const start = performance.now();
  const result = await fn();
  const end = performance.now();

  const durationMs = end - start;
  const isBlocking = durationMs > threshold;

  return {
    result,
    durationMs,
    isBlocking,
    isSync: false,
    timestamp,
    environment: env,
    phase: operation,
  };
}

/**
 * Measure multiple phases of execution
 *
 * Useful for breaking down a complex operation into measured phases.
 *
 * @param phases Array of named functions to measure
 * @returns Promise with array of timing results for each phase
 *
 * @example
 * ```typescript
 * const phases = await measurePhases([
 *   { name: 'parse', fn: () => parse(code) },
 *   { name: 'walk', fn: () => walk(tree) },
 *   { name: 'resolve', fn: async () => await resolve(refs) }
 * ]);
 *
 * phases.forEach(p => {
 *   console.log(`${p.phase}: ${p.durationMs}ms ${p.isBlocking ? 'BLOCKING!' : 'OK'}`);
 * });
 * ```
 */
export async function measurePhases<T>(
  phases: Array<{ name: string; fn: () => T | Promise<T> }>,
): Promise<Array<BlockingTimingResult<T>>> {
  const results: Array<BlockingTimingResult<T>> = [];

  for (const phase of phases) {
    const isAsync = phase.fn.constructor.name === 'AsyncFunction';

    if (isAsync) {
      const result = await measureAsyncBlocking(
        phase.name,
        phase.fn as () => Promise<T>,
      );
      results.push(result);
    } else {
      const result = measureSyncBlocking(phase.name, phase.fn as () => T);
      results.push(result);
    }
  }

  return results;
}

/**
 * Create a performance mark (browser Performance API)
 *
 * No-op in environments without Performance API.
 * Useful for integrating with browser DevTools Performance timeline.
 *
 * @param name Mark name
 *
 * @example
 * ```typescript
 * markPerformance('compile-start');
 * const result = compile(code);
 * markPerformance('compile-end');
 * measurePerformance('compile', 'compile-start', 'compile-end');
 * ```
 */
export function markPerformance(name: string): void {
  if (typeof performance !== 'undefined' && performance.mark) {
    try {
      performance.mark(name);
    } catch (_e) {
      // Ignore errors (e.g., duplicate marks in some browsers)
    }
  }
}

/**
 * Create a performance measure between two marks (browser Performance API)
 *
 * No-op in environments without Performance API.
 * Creates a measure entry visible in browser DevTools Performance timeline.
 *
 * @param name Measure name
 * @param startMark Start mark name
 * @param endMark End mark name
 *
 * @example
 * ```typescript
 * markPerformance('compile-start');
 * compile(code);
 * markPerformance('compile-end');
 * measurePerformance('compile-operation', 'compile-start', 'compile-end');
 *
 * // Now visible in Chrome DevTools Performance timeline
 * ```
 */
export function measurePerformance(
  name: string,
  startMark: string,
  endMark: string,
): void {
  if (typeof performance !== 'undefined' && performance.measure) {
    try {
      performance.measure(name, startMark, endMark);
    } catch (_e) {
      // Ignore errors (e.g., marks don't exist)
    }
  }
}

/**
 * Format timing result for console output
 *
 * @param result Timing result to format
 * @returns Formatted string
 *
 * @example
 * ```typescript
 * const result = measureSyncBlocking('compile', () => compile(code));
 * console.log(formatTimingResult(result));
 * // Output: "[PERF] compile: 1234ms BLOCKING (worker)"
 * ```
 */
export function formatTimingResult<T>(result: BlockingTimingResult<T>): string {
  const blocking = result.isBlocking ? 'BLOCKING' : 'OK';
  const sync = result.isSync ? 'sync' : 'async';
  const phase = result.phase || 'operation';
  const duration = result.durationMs.toFixed(2);
  const details = `(${sync}, ${result.environment})`;
  return `[PERF] ${phase}: ${duration}ms ${blocking} ${details}`;
}

/**
 * Format bytes for memory measurements
 *
 * @param bytes Number of bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * Map operation name to metric name
 *
 * @param operation Operation name
 * @returns Metric name or undefined if no mapping
 */
function getMetricNameForOperation(operation: string): string | undefined {
  // Map common operation names to metric names
  const operationMap: Record<string, string> = {
    compile: PERFORMANCE_METRICS.COMPILE_DURATION,
    'parse-tree': PERFORMANCE_METRICS.PARSE_TREE_DURATION,
    'tree-walk': PERFORMANCE_METRICS.TREE_WALK_DURATION,
    'walk-tree': PERFORMANCE_METRICS.TREE_WALK_DURATION,
    'symbol-resolution': PERFORMANCE_METRICS.SYMBOL_RESOLUTION_DURATION,
    'member-resolution': PERFORMANCE_METRICS.MEMBER_RESOLUTION_DURATION,
    'stdlib-load': PERFORMANCE_METRICS.STDLIB_LOAD_DURATION,
    'reference-resolution': PERFORMANCE_METRICS.REFERENCE_RESOLUTION_DURATION,
  };

  return operationMap[operation.toLowerCase()];
}
