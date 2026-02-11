/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Performance benchmarking utilities for e2e tests.
 *
 * Provides tools for measuring and reporting performance metrics:
 * - Operation timing
 * - Memory usage tracking
 * - Performance regression detection
 * - Baseline comparison
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count';
  timestamp: number;
  context?: Record<string, any>;
}

export interface PerformanceBenchmark {
  operation: string;
  duration: number;
  startTime: number;
  endTime: number;
  metadata?: Record<string, any>;
}

export interface MemorySnapshot {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: number;
}

export interface PerformanceBaseline {
  operation: string;
  baseline: number;
  threshold: number; // Percentage above baseline that's acceptable
  unit: 'ms' | 'bytes';
}

/**
 * Performance baseline thresholds for common operations
 */
export const PERFORMANCE_BASELINES: PerformanceBaseline[] = [
  // Extension activation
  { operation: 'extension.activation', baseline: 3000, threshold: 20, unit: 'ms' },
  { operation: 'lsp.initialization', baseline: 2000, threshold: 20, unit: 'ms' },

  // LSP operations
  { operation: 'outline.populate', baseline: 1000, threshold: 30, unit: 'ms' },
  { operation: 'hover.show', baseline: 500, threshold: 30, unit: 'ms' },
  { operation: 'goto-definition', baseline: 500, threshold: 30, unit: 'ms' },
  { operation: 'completion.trigger', baseline: 800, threshold: 30, unit: 'ms' },
  { operation: 'signature-help', baseline: 600, threshold: 30, unit: 'ms' },

  // File operations
  { operation: 'file.open', baseline: 500, threshold: 30, unit: 'ms' },
  { operation: 'file.save', baseline: 300, threshold: 30, unit: 'ms' },

  // Document operations
  { operation: 'document.parse', baseline: 1500, threshold: 30, unit: 'ms' },
  { operation: 'document.update', baseline: 500, threshold: 30, unit: 'ms' },

  // Memory (in MB)
  { operation: 'memory.initial', baseline: 50 * 1024 * 1024, threshold: 20, unit: 'bytes' },
  { operation: 'memory.peak', baseline: 200 * 1024 * 1024, threshold: 30, unit: 'bytes' },
];

/**
 * Performance benchmarking class for measuring operation timing
 */
export class PerformanceBenchmarker {
  private benchmarks: Map<string, PerformanceBenchmark> = new Map();
  private metrics: PerformanceMetric[] = [];

  /**
   * Start timing an operation
   */
  start(operation: string, metadata?: Record<string, any>): void {
    const startTime = Date.now();
    this.benchmarks.set(operation, {
      operation,
      duration: 0,
      startTime,
      endTime: 0,
      metadata,
    });
    console.log(`⏱️ Started benchmark: ${operation}`);
  }

  /**
   * End timing an operation and record the duration
   */
  end(operation: string): PerformanceBenchmark | undefined {
    const benchmark = this.benchmarks.get(operation);
    if (!benchmark) {
      console.warn(`⚠️ No benchmark started for: ${operation}`);
      return undefined;
    }

    const endTime = Date.now();
    benchmark.endTime = endTime;
    benchmark.duration = endTime - benchmark.startTime;

    this.recordMetric({
      name: operation,
      value: benchmark.duration,
      unit: 'ms',
      timestamp: endTime,
      context: benchmark.metadata,
    });

    console.log(`⏱️ Completed benchmark: ${operation} - ${benchmark.duration}ms`);
    return benchmark;
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
  }

  /**
   * Get all recorded benchmarks
   */
  getBenchmarks(): PerformanceBenchmark[] {
    return Array.from(this.benchmarks.values());
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return this.metrics;
  }

  /**
   * Get a specific benchmark by operation name
   */
  getBenchmark(operation: string): PerformanceBenchmark | undefined {
    return this.benchmarks.get(operation);
  }

  /**
   * Clear all benchmarks and metrics
   */
  clear(): void {
    this.benchmarks.clear();
    this.metrics = [];
  }

  /**
   * Compare operation duration against baseline
   */
  compareToBaseline(operation: string): {
    operation: string;
    actual: number;
    baseline: number;
    threshold: number;
    difference: number;
    differencePercent: number;
    withinThreshold: boolean;
  } | null {
    const benchmark = this.benchmarks.get(operation);
    const baseline = PERFORMANCE_BASELINES.find((b) => b.operation === operation);

    if (!benchmark || !baseline) {
      return null;
    }

    const difference = benchmark.duration - baseline.baseline;
    const differencePercent = (difference / baseline.baseline) * 100;
    const maxAcceptable = baseline.baseline * (1 + baseline.threshold / 100);
    const withinThreshold = benchmark.duration <= maxAcceptable;

    return {
      operation,
      actual: benchmark.duration,
      baseline: baseline.baseline,
      threshold: baseline.threshold,
      difference,
      differencePercent,
      withinThreshold,
    };
  }

  /**
   * Generate a performance report
   */
  generateReport(): string {
    const lines: string[] = [];
    lines.push('');
    lines.push('='.repeat(80));
    lines.push('PERFORMANCE BENCHMARK REPORT');
    lines.push('='.repeat(80));
    lines.push('');

    // Summary statistics
    const benchmarks = this.getBenchmarks();
    if (benchmarks.length === 0) {
      lines.push('No benchmarks recorded.');
      return lines.join('\n');
    }

    lines.push(`Total Operations: ${benchmarks.length}`);
    lines.push('');

    // Individual benchmarks
    lines.push('Benchmark Results:');
    lines.push('-'.repeat(80));
    lines.push(`${'Operation'.padEnd(40)} ${'Duration'.padEnd(15)} ${'vs Baseline'.padEnd(25)}`);
    lines.push('-'.repeat(80));

    for (const benchmark of benchmarks) {
      const comparison = this.compareToBaseline(benchmark.operation);
      const durationStr = `${benchmark.duration.toFixed(2)}ms`;

      let comparisonStr = 'N/A';
      let statusIcon = '  ';

      if (comparison) {
        const sign = comparison.difference >= 0 ? '+' : '';
        comparisonStr = `${sign}${comparison.differencePercent.toFixed(1)}% (${comparison.withinThreshold ? 'OK' : 'SLOW'})`;
        statusIcon = comparison.withinThreshold ? '✅' : '⚠️';
      }

      lines.push(
        `${statusIcon} ${benchmark.operation.padEnd(38)} ${durationStr.padEnd(15)} ${comparisonStr}`
      );
    }

    lines.push('-'.repeat(80));
    lines.push('');

    // Performance issues
    const issues = benchmarks
      .map((b) => this.compareToBaseline(b.operation))
      .filter((c) => c && !c.withinThreshold);

    if (issues.length > 0) {
      lines.push('⚠️ Performance Issues:');
      lines.push('');
      for (const issue of issues) {
        if (issue) {
          lines.push(
            `  - ${issue.operation}: ${issue.actual.toFixed(2)}ms (expected: ${issue.baseline}ms, +${issue.differencePercent.toFixed(1)}%)`
          );
        }
      }
      lines.push('');
    } else {
      lines.push('✅ All operations within acceptable performance thresholds.');
      lines.push('');
    }

    lines.push('='.repeat(80));
    return lines.join('\n');
  }
}

/**
 * Memory profiler for tracking memory usage
 */
export class MemoryProfiler {
  private snapshots: MemorySnapshot[] = [];

  /**
   * Take a memory snapshot (requires desktop mode with --js-flags=--expose-gc)
   */
  async takeSnapshot(page: any): Promise<MemorySnapshot | null> {
    try {
      const memory = await page.evaluate(() => {
        const perf = performance as any;
        if (perf.memory) {
          return {
            usedJSHeapSize: perf.memory.usedJSHeapSize,
            totalJSHeapSize: perf.memory.totalJSHeapSize,
            jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
            timestamp: Date.now(),
          };
        }
        return null;
      });

      if (memory) {
        this.snapshots.push(memory);
        console.log(
          `📊 Memory snapshot: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB used`
        );
        return memory;
      }
      return null;
    } catch (error) {
      console.warn('⚠️ Unable to take memory snapshot. Desktop mode required.');
      return null;
    }
  }

  /**
   * Force garbage collection (requires desktop mode with --js-flags=--expose-gc)
   */
  async forceGC(page: any): Promise<boolean> {
    try {
      await page.evaluate(() => {
        if (typeof (global as any).gc === 'function') {
          (global as any).gc();
          return true;
        }
        return false;
      });
      console.log('♻️ Forced garbage collection');
      return true;
    } catch (error) {
      console.warn('⚠️ Unable to force GC. Desktop mode required.');
      return false;
    }
  }

  /**
   * Get all memory snapshots
   */
  getSnapshots(): MemorySnapshot[] {
    return this.snapshots;
  }

  /**
   * Get peak memory usage
   */
  getPeakMemory(): MemorySnapshot | null {
    if (this.snapshots.length === 0) return null;
    return this.snapshots.reduce((peak, current) =>
      current.usedJSHeapSize > peak.usedJSHeapSize ? current : peak
    );
  }

  /**
   * Get average memory usage
   */
  getAverageMemory(): number | null {
    if (this.snapshots.length === 0) return null;
    const sum = this.snapshots.reduce((acc, s) => acc + s.usedJSHeapSize, 0);
    return sum / this.snapshots.length;
  }

  /**
   * Clear all snapshots
   */
  clear(): void {
    this.snapshots = [];
  }

  /**
   * Generate memory report
   */
  generateReport(): string {
    const lines: string[] = [];
    lines.push('');
    lines.push('='.repeat(80));
    lines.push('MEMORY PROFILING REPORT');
    lines.push('='.repeat(80));
    lines.push('');

    if (this.snapshots.length === 0) {
      lines.push('No memory snapshots recorded.');
      lines.push('');
      lines.push('Note: Memory profiling requires desktop mode.');
      lines.push('Run tests with: npm run test:e2e:desktop');
      return lines.join('\n');
    }

    const peak = this.getPeakMemory();
    const average = this.getAverageMemory();
    const initial = this.snapshots[0];
    const final = this.snapshots[this.snapshots.length - 1];

    lines.push(`Total Snapshots: ${this.snapshots.length}`);
    lines.push('');

    lines.push('Memory Statistics:');
    lines.push('-'.repeat(80));
    lines.push(
      `Initial Memory:  ${(initial.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`
    );
    lines.push(
      `Final Memory:    ${(final.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`
    );
    lines.push(
      `Peak Memory:     ${peak ? (peak.usedJSHeapSize / 1024 / 1024).toFixed(2) : 'N/A'}MB`
    );
    lines.push(
      `Average Memory:  ${average ? (average / 1024 / 1024).toFixed(2) : 'N/A'}MB`
    );
    lines.push(
      `Memory Growth:   ${((final.usedJSHeapSize - initial.usedJSHeapSize) / 1024 / 1024).toFixed(2)}MB`
    );
    lines.push('-'.repeat(80));
    lines.push('');

    // Check against baselines
    const initialBaseline = PERFORMANCE_BASELINES.find(
      (b) => b.operation === 'memory.initial'
    );
    const peakBaseline = PERFORMANCE_BASELINES.find(
      (b) => b.operation === 'memory.peak'
    );

    if (initialBaseline && initial.usedJSHeapSize > initialBaseline.baseline) {
      lines.push(
        `⚠️ Initial memory exceeds baseline: ${(initial.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB > ${(initialBaseline.baseline / 1024 / 1024).toFixed(2)}MB`
      );
    }

    if (peak && peakBaseline && peak.usedJSHeapSize > peakBaseline.baseline) {
      lines.push(
        `⚠️ Peak memory exceeds baseline: ${(peak.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB > ${(peakBaseline.baseline / 1024 / 1024).toFixed(2)}MB`
      );
    }

    lines.push('');
    lines.push('='.repeat(80));
    return lines.join('\n');
  }
}

/**
 * Measure the duration of an async operation
 */
export async function measureAsync<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const startTime = Date.now();
  console.log(`⏱️ Starting: ${operation}`);

  const result = await fn();

  const duration = Date.now() - startTime;
  console.log(`⏱️ Completed: ${operation} - ${duration}ms`);

  return { result, duration };
}

/**
 * Measure the duration of a synchronous operation
 */
export function measure<T>(
  operation: string,
  fn: () => T
): { result: T; duration: number } {
  const startTime = Date.now();
  console.log(`⏱️ Starting: ${operation}`);

  const result = fn();

  const duration = Date.now() - startTime;
  console.log(`⏱️ Completed: ${operation} - ${duration}ms`);

  return { result, duration };
}
