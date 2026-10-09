/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Bench, BenchResult, BenchRunOptions } from 'vitest';

export interface BenchmarkTarget {
  hz: number;
  id: string;
  name: string;
  stats: {
    deviation: number;
    mean: number;
    rme: number;
    variance: number;
  };
  toString(): string;
}

interface BenchmarkSettings {
  initCount: number;
  maxTime: number;
  minSamples: number;
  minTime: number;
}

interface BenchmarkDefinition extends Partial<BenchmarkSettings> {
  fn: () => void | Promise<void>;
}

type CycleHandler = (event: { target: BenchmarkTarget }) => void;
type CompleteHandler = (suite: VitestBenchmarkSuite) => void | Promise<void>;

const toRunOptions = ({
  initCount = 1,
  maxTime = 10,
  minSamples = 1,
  minTime = 0,
}: BenchmarkDefinition): BenchRunOptions => ({
  iterations: minSamples,
  time: maxTime * 1_000,
  warmupIterations: initCount,
  warmupTime: minTime * 1_000,
});

/** Runs native registrations sequentially, retaining only the legacy reporting shape. */
export class VitestBenchmarkSuite {
  private readonly controller = new AbortController();
  private readonly definitions = new Map<string, BenchmarkDefinition>();
  private readonly targets: BenchmarkTarget[] = [];
  private cycleHandler: CycleHandler | undefined;
  private completeHandler: CompleteHandler | undefined;

  public constructor(
    private readonly bench: Bench,
    _name?: string,
    private readonly signal?: AbortSignal,
  ) {}

  public add(name: string, definition: BenchmarkDefinition): this {
    this.definitions.set(name, definition);
    return this;
  }

  public on(
    event: 'cycle' | 'complete',
    handler: CycleHandler | CompleteHandler,
  ): this {
    if (event === 'cycle') {
      this.cycleHandler = handler as CycleHandler;
    } else {
      this.completeHandler = handler as CompleteHandler;
    }
    return this;
  }

  public run(): Promise<void> {
    return this.runBenchmarks();
  }

  public abort(): this {
    this.controller.abort(new Error('Benchmark suite aborted'));
    return this;
  }

  public filter(_name: 'fastest'): { map: (property: 'name') => string[] } {
    const fastest = this.targets.reduce<BenchmarkTarget | undefined>(
      (current, target) =>
        current === undefined || target.stats.mean < current.stats.mean
          ? target
          : current,
      undefined,
    );
    return { map: () => (fastest === undefined ? [] : [fastest.name]) };
  }

  private async runBenchmarks(): Promise<void> {
    this.targets.length = 0;
    const signal = this.signal
      ? AbortSignal.any([this.controller.signal, this.signal])
      : this.controller.signal;
    signal.throwIfAborted();
    for (const [name, definition] of this.definitions) {
      signal.throwIfAborted();
      const registration = this.bench(name, {}, async () => {
        signal.throwIfAborted();
        // Native cancellation stops sampling but cannot interrupt an awaiting fn.
        // Race each invocation so abort also settles a stalled operation.
        let onAbort: () => void = () => {};
        const aborted = new Promise<never>((_, reject) => {
          onAbort = () => reject(signal.reason);
          signal.addEventListener('abort', onAbort, { once: true });
        });
        try {
          await Promise.race([Promise.resolve().then(definition.fn), aborted]);
        } finally {
          signal.removeEventListener('abort', onAbort);
        }
      });
      const result: BenchResult = await registration.run({
        ...toRunOptions(definition),
        signal,
      });
      signal.throwIfAborted();
      const target: BenchmarkTarget = {
        hz: result.throughput.mean,
        id: name,
        name,
        stats: {
          mean: result.latency.mean / 1_000,
          deviation: result.latency.sd / 1_000,
          variance: result.latency.variance / 1_000_000,
          rme: result.latency.rme,
        },
        toString: () =>
          `${name} x ${target.hz.toFixed(2)} ops/sec ±${target.stats.rme.toFixed(2)}%`,
      };
      this.targets.push(target);
      this.cycleHandler?.({ target });
    }
    await this.completeHandler?.(this);
  }
}

/** Bounds a request without leaving its timeout active after settlement. */
export async function withBenchmarkTimeout<T>(
  operation: () => PromiseLike<T>,
  timeoutMs: number,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`Request timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });
  try {
    return await Promise.race([operation(), timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}
