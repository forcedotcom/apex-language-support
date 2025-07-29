/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

interface BaselineMetric {
  timestamp: string;
  operation: string;
  duration: number;
  success: boolean;
  error?: string;
}

interface BaselineStats {
  totalSamples: number;
  successfulSamples: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  successRate: number;
  metrics: BaselineMetric[];
  generatedAt: string;
}

class BaselineCollector {
  private metrics: BaselineMetric[] = [];

  async measureOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    console.log(`[BASELINE] Starting measurement for: ${operationName}`);
    const startTime = performance.now();
    const timestamp = new Date().toISOString();

    try {
      const result = await operation();
      const duration = Math.round((performance.now() - startTime) * 100) / 100;

      this.recordMetric({
        timestamp,
        operation: operationName,
        duration,
        success: true,
      });

      console.log(`[BASELINE] ${operationName}: ${duration}ms (SUCCESS)`);
      console.log(`[BASELINE] Total metrics collected: ${this.metrics.length}`);
      return result;
    } catch (error) {
      const duration = Math.round((performance.now() - startTime) * 100) / 100;

      this.recordMetric({
        timestamp,
        operation: operationName,
        duration,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });

      console.log(`[BASELINE] ${operationName}: ${duration}ms (FAILED)`);
      throw error;
    }
  }

  recordMetric(metric: BaselineMetric): void {
    this.metrics.push(metric);
  }

  generateStats(): BaselineStats {
    if (this.metrics.length === 0) {
      return {
        totalSamples: 0,
        successfulSamples: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        successRate: 0,
        metrics: [],
        generatedAt: new Date().toISOString(),
      };
    }

    const durations = this.metrics.map((m) => m.duration);
    const successfulSamples = this.metrics.filter((m) => m.success).length;

    return {
      totalSamples: this.metrics.length,
      successfulSamples,
      averageDuration:
        Math.round(
          (durations.reduce((a, b) => a + b, 0) / durations.length) * 100,
        ) / 100,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      successRate: Math.round((successfulSamples / this.metrics.length) * 100),
      metrics: this.metrics,
      generatedAt: new Date().toISOString(),
    };
  }

  async saveStats(workspaceRoot?: string): Promise<void> {
    const stats = this.generateStats();
    const fs = await import('fs/promises');
    const path = await import('path');

    const outputPath = workspaceRoot
      ? path.join(workspaceRoot, 'baselineStats.json')
      : 'baselineStats.json';

    try {
      await fs.writeFile(outputPath, JSON.stringify(stats, null, 2));
      console.log(`[BASELINE] Stats saved to: ${outputPath}`);
    } catch (error) {
      console.error(`[BASELINE] Failed to save stats: ${error}`);
    }
  }

  clear(): void {
    console.log(`[BASELINE] Clearing ${this.metrics.length} previous metrics`);
    this.metrics = [];
  }
}

export const baselineCollector = new BaselineCollector();
