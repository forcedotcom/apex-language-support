/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Effect-based performance metrics for production observability.
 *
 * This module provides Effect.Metric-based performance instrumentation that:
 * - Emits structured metrics for production monitoring
 * - Integrates with OpenTelemetry when configured
 * - Works alongside the simple test-time measurement utilities
 * - Provides histograms, counters, and gauges for performance data
 *
 * Usage:
 * ```typescript
 * import { withPerformanceMetrics } from '@salesforce/apex-lsp-shared';
 *
 * // Wrap an Effect operation with automatic timing metrics
 * const result = yield* withPerformanceMetrics(
 *   'compile',
 *   Effect.sync(() => compile(code))
 * );
 * ```
 */

/**
 * Performance metric names used throughout the system
 */
export const PERFORMANCE_METRICS = {
  // Compilation metrics
  COMPILE_DURATION: 'apex.compile.duration',
  COMPILE_BLOCKING: 'apex.compile.blocking',
  PARSE_TREE_DURATION: 'apex.parse.duration',
  TREE_WALK_DURATION: 'apex.walk.duration',

  // Symbol resolution metrics
  SYMBOL_RESOLUTION_DURATION: 'apex.symbol.resolution.duration',
  MEMBER_RESOLUTION_DURATION: 'apex.symbol.member.duration',
  STDLIB_LOAD_DURATION: 'apex.stdlib.load.duration',
  STDLIB_CACHE_HITS: 'apex.stdlib.cache.hits',
  STDLIB_CACHE_MISSES: 'apex.stdlib.cache.misses',

  // Reference resolution metrics
  REFERENCE_RESOLUTION_DURATION: 'apex.reference.resolution.duration',
  DEFERRED_REFERENCE_DURATION: 'apex.reference.deferred.duration',

  // Blocking detection metrics
  EVENT_LOOP_BLOCKING: 'apex.eventloop.blocking',
  CPU_INTENSIVE_OPS: 'apex.cpu.intensive',

  // Cache effectiveness
  SYMBOL_LOOKUP_DURATION: 'apex.symbol.lookup.duration',
  SYMBOL_CACHE_HITS: 'apex.symbol.cache.hits',
  SYMBOL_CACHE_MISSES: 'apex.symbol.cache.misses',
} as const;

/**
 * Tags for metric dimensions
 */
export interface PerformanceMetricTags {
  operation: string;
  environment?: 'node' | 'browser' | 'worker';
  isBlocking?: boolean;
  fileType?: string;
  phase?: string;
}

/**
 * Type-safe metric creation helpers
 *
 * Note: These return types that match Effect.Metric but don't require Effect
 * as a dependency at this level. They're meant to be used by code that already
 * has Effect imported.
 */
export type PerformanceHistogram = any; // Effect.Metric.Metric.Histogram
export type PerformanceCounter = any; // Effect.Metric.Metric.Counter
export type PerformanceGauge = any; // Effect.Metric.Metric.Gauge

/**
 * Metrics registry (lazy-loaded when Effect is available)
 */
let metricsRegistry: Map<string, any> | null = null;

/**
 * Initialize metrics (call this when Effect is available)
 *
 * @param Effect The Effect module
 * @returns Map of initialized metrics
 */
export function initializeMetrics(Effect: any): Map<string, any> {
  if (metricsRegistry) {
    return metricsRegistry;
  }

  const { Metric } = Effect;
  metricsRegistry = new Map();

  // Duration histograms (in milliseconds)
  metricsRegistry.set(
    PERFORMANCE_METRICS.COMPILE_DURATION,
    Metric.histogram(PERFORMANCE_METRICS.COMPILE_DURATION, {
      description: 'Apex compilation duration',
      unit: 'milliseconds',
      boundaries: [10, 50, 100, 500, 1000, 5000, 10000],
    }),
  );

  metricsRegistry.set(
    PERFORMANCE_METRICS.SYMBOL_RESOLUTION_DURATION,
    Metric.histogram(PERFORMANCE_METRICS.SYMBOL_RESOLUTION_DURATION, {
      description: 'Symbol resolution duration',
      unit: 'milliseconds',
      boundaries: [1, 10, 50, 100, 500, 1000],
    }),
  );

  metricsRegistry.set(
    PERFORMANCE_METRICS.STDLIB_LOAD_DURATION,
    Metric.histogram(PERFORMANCE_METRICS.STDLIB_LOAD_DURATION, {
      description: 'Standard library class loading duration',
      unit: 'milliseconds',
      boundaries: [10, 50, 100, 500, 1000, 5000],
    }),
  );

  // Counters
  metricsRegistry.set(
    PERFORMANCE_METRICS.STDLIB_CACHE_HITS,
    Metric.counter(PERFORMANCE_METRICS.STDLIB_CACHE_HITS, {
      description: 'Standard library cache hits',
    }),
  );

  metricsRegistry.set(
    PERFORMANCE_METRICS.STDLIB_CACHE_MISSES,
    Metric.counter(PERFORMANCE_METRICS.STDLIB_CACHE_MISSES, {
      description: 'Standard library cache misses',
    }),
  );

  metricsRegistry.set(
    PERFORMANCE_METRICS.EVENT_LOOP_BLOCKING,
    Metric.counter(PERFORMANCE_METRICS.EVENT_LOOP_BLOCKING, {
      description: 'Count of operations that blocked the event loop',
    }),
  );

  return metricsRegistry;
}

/**
 * Get a metric by name (returns undefined if metrics not initialized)
 *
 * @param name Metric name
 * @returns Metric or undefined
 */
export function getMetric(name: string): any | undefined {
  return metricsRegistry?.get(name);
}

/**
 * Check if metrics are initialized
 */
export function hasMetrics(): boolean {
  return metricsRegistry !== null;
}

/**
 * Record a duration metric
 *
 * @param metricName Metric name
 * @param durationMs Duration in milliseconds
 * @param tags Optional tags for dimensions
 */
export function recordDuration(
  metricName: string,
  durationMs: number,
  tags?: PerformanceMetricTags,
): void {
  const metric = getMetric(metricName);
  if (metric && typeof metric.update === 'function') {
    // Tag the metric if tags are provided
    // Note: Effect metrics support tagging via Metric.tagged()
    metric.update(durationMs);
  }
}

/**
 * Increment a counter metric
 *
 * @param metricName Metric name
 * @param value Value to increment by (default: 1)
 * @param tags Optional tags for dimensions
 */
export function incrementCounter(
  metricName: string,
  value: number = 1,
  tags?: PerformanceMetricTags,
): void {
  const metric = getMetric(metricName);
  if (metric && typeof metric.increment === 'function') {
    metric.increment(value);
  }
}

/**
 * Record blocking detection
 *
 * @param operation Operation name
 * @param durationMs Duration in milliseconds
 * @param threshold Blocking threshold in milliseconds
 */
export function recordBlocking(
  operation: string,
  durationMs: number,
  threshold: number,
): void {
  if (durationMs > threshold) {
    incrementCounter(PERFORMANCE_METRICS.EVENT_LOOP_BLOCKING, 1, {
      operation,
      isBlocking: true,
    });
  }
}

/**
 * Helper to create a tagged metric
 *
 * This is a placeholder that can be enhanced when full Effect integration is added.
 * For now, it just returns the base metric name with tags appended.
 *
 * @param metricName Base metric name
 * @param tags Tags to apply
 * @returns Tagged metric identifier
 */
export function createTaggedMetricName(
  metricName: string,
  tags: PerformanceMetricTags,
): string {
  const tagStr = Object.entries(tags)
    .map(([k, v]) => `${k}=${v}`)
    .join(',');
  return `${metricName}{${tagStr}}`;
}
