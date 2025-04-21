/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';

import * as Benchmark from 'benchmark';

/**
 * Benchmark result interface
 */
export interface BenchmarkResult {
  name: string;
  hz: number;
  stats: {
    rme: number;
    mean: number;
    deviation: number;
    sample: number[];
  };
  times: {
    cycle: number;
    elapsed: number;
    period: number;
    timeStamp: number;
  };
}

/**
 * Options for the Benchmark Runner
 */
export interface BenchmarkRunnerOptions {
  /**
   * The name of the benchmark suite
   */
  name: string;

  /**
   * Path to output the benchmark results
   */
  outputPath?: string;

  /**
   * Whether to log results to console
   */
  logToConsole?: boolean;
}

/**
 * A runner for executing benchmark.js tests
 */
export class BenchmarkRunner {
  private suite: Benchmark.Suite;
  private options: BenchmarkRunnerOptions;
  private results: BenchmarkResult[] = [];

  /**
   * Create a new benchmark runner
   * @param options Options for the benchmark runner
   */
  constructor(options: BenchmarkRunnerOptions) {
    this.options = {
      logToConsole: true,
      outputPath: 'benchmark-results.json',
      ...options,
    };

    this.suite = new Benchmark.Suite(this.options.name);
  }

  /**
   * Add a test case to the benchmark suite
   * @param name Name of the test case
   * @param fn Function to benchmark
   * @param options Additional options for benchmark.js
   */
  public add(name: string, fn: Function, options?: Benchmark.Options): this {
    this.suite.add(name, fn, options);
    return this;
  }

  /**
   * Run the benchmark suite
   * @returns Promise that resolves when benchmarks complete
   */
  public async run(): Promise<BenchmarkResult[]> {
    return new Promise<BenchmarkResult[]>((resolve, reject) => {
      this.suite
        .on('cycle', (event: Benchmark.Event) => {
          const benchmark = event.target as Benchmark;
          if (this.options.logToConsole) {
            console.log(String(benchmark));
          }

          // Store the benchmark result
          this.results.push({
            name: benchmark.name,
            hz: benchmark.hz,
            stats: {
              rme: benchmark.stats.rme,
              mean: benchmark.stats.mean,
              deviation: benchmark.stats.deviation,
              sample: benchmark.stats.sample,
            },
            times: {
              cycle: benchmark.times.cycle,
              elapsed: benchmark.times.elapsed,
              period: benchmark.times.period,
              timeStamp: benchmark.times.timeStamp,
            },
          });
        })
        .on('complete', () => {
          if (this.options.logToConsole) {
            console.log('Benchmark completed');
          }

          // Write results to file if outputPath is provided
          if (this.options.outputPath) {
            this.saveResults(this.options.outputPath);
          }

          resolve(this.results);
        })
        .on('error', (error: Error) => {
          reject(error);
        })
        .run({ async: true });
    });
  }

  /**
   * Save benchmark results to a file
   * @param outputPath Path to save the results
   */
  private saveResults(outputPath: string): void {
    try {
      // Ensure directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Format the results for github-action-benchmark
      const formattedResults = this.results.map((result) => ({
        name: result.name,
        unit: 'ops/sec',
        value: result.hz,
        range: `±${result.stats.rme.toFixed(2)}%`,
        extra: `Sample size: ${result.stats.sample.length}`,
      }));

      // Write the results to file
      fs.writeFileSync(outputPath, JSON.stringify(formattedResults, null, 2));

      if (this.options.logToConsole) {
        console.log(`Benchmark results saved to ${outputPath}`);
      }
    } catch (error) {
      console.error(`Error saving benchmark results: ${error}`);
    }
  }

  /**
   * Get the benchmark results
   */
  public getResults(): BenchmarkResult[] {
    return this.results;
  }
}
