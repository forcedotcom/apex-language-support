/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect, it, vi } from 'vitest';
import type { Bench, BenchResult, BenchRunOptions } from 'vitest';
import {
  VitestBenchmarkSuite,
  withBenchmarkTimeout,
} from './vitest-benchmark-suite';

const settings = { maxTime: 0.01, minTime: 0, minSamples: 3, initCount: 1 };

it('reports native latency statistics with seconds-based legacy units', async ({
  bench,
}) => {
  let nativeResult: BenchResult | undefined;
  const factory: Bench = Object.assign(
    ((name, options, fn) => {
      const registration = bench(name, options, fn);
      const run = registration.run;
      registration.run = async (options?: BenchRunOptions) => {
        nativeResult = await run(options);
        return nativeResult;
      };
      return registration;
    }) as Bench,
    { compare: bench.compare, from: bench.from },
  );
  const cycle = vi.fn();
  const suite = new VitestBenchmarkSuite(factory)
    .add('variable latency', {
      ...settings,
      fn: async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
      },
    })
    .on('cycle', cycle);
  await suite.run();
  expect(nativeResult).toBeDefined();
  if (!nativeResult) return;
  expect(cycle.mock.calls[0][0].target.stats).toEqual({
    mean: nativeResult.latency.mean / 1000,
    deviation: nativeResult.latency.sd / 1000,
    variance: nativeResult.latency.variance / 1_000_000,
    rme: nativeResult.latency.rme,
  });
  expect(cycle.mock.calls[0][0].target.hz).toBe(nativeResult.throughput.mean);
});

it('propagates rejected benchmark operations and skips completion', async ({
  bench,
}) => {
  const complete = vi.fn();
  const suite = new VitestBenchmarkSuite(bench)
    .add('rejection', {
      ...settings,
      fn: async () => {
        throw new Error('operation failed');
      },
    })
    .on('complete', complete);
  await expect(suite.run()).rejects.toThrow('operation failed');
  expect(complete).not.toHaveBeenCalled();
});

it('aborts a pending operation and never starts the next benchmark', async ({
  bench,
}) => {
  const next = vi.fn();
  const complete = vi.fn();
  const suite = new VitestBenchmarkSuite(bench);
  suite
    .add('pending', {
      ...settings,
      fn: () => new Promise<void>(() => setTimeout(() => suite.abort(), 5)),
    })
    .add('next', { ...settings, fn: next })
    .on('complete', complete);
  await expect(suite.run()).rejects.toThrow('Benchmark suite aborted');
  expect(next).not.toHaveBeenCalled();
  expect(complete).not.toHaveBeenCalled();
});

it('runs each definition with its own native options', async ({ bench }) => {
  const optionsUsed: (BenchRunOptions | undefined)[] = [];
  const factory: Bench = Object.assign(
    ((name, options, fn) => {
      const registration = bench(name, options, fn);
      const run = registration.run;
      registration.run = (options?: BenchRunOptions) => {
        optionsUsed.push(options);
        return run(options);
      };
      return registration;
    }) as Bench,
    { compare: bench.compare, from: bench.from },
  );
  await new VitestBenchmarkSuite(factory)
    .add('first', { ...settings, fn: () => {} })
    .add('second', {
      maxTime: 0.02,
      minTime: 0.001,
      minSamples: 5,
      initCount: 2,
      fn: () => {},
    })
    .run();
  expect(optionsUsed).toEqual([
    expect.objectContaining({
      time: 10,
      iterations: 3,
      warmupTime: 0,
      warmupIterations: 1,
    }),
    expect.objectContaining({
      time: 20,
      iterations: 5,
      warmupTime: 1,
      warmupIterations: 2,
    }),
  ]);
});

it('honors enclosing test cancellation before running any definition', async ({
  bench,
}) => {
  const controller = new AbortController();
  const operation = vi.fn();
  controller.abort(new Error('test cancelled'));
  const suite = new VitestBenchmarkSuite(
    bench,
    undefined,
    controller.signal,
  ).add('cancelled', { ...settings, fn: operation });
  await expect(suite.run()).rejects.toThrow('test cancelled');
  expect(operation).not.toHaveBeenCalled();
});

it('clears request timers on success and failure, and rejects timed out requests', async () => {
  vi.useFakeTimers();
  try {
    await expect(
      withBenchmarkTimeout(() => Promise.resolve('ok'), 20),
    ).resolves.toBe('ok');
    expect(vi.getTimerCount()).toBe(0);
    await expect(
      withBenchmarkTimeout(
        () => Promise.reject(new Error('request failed')),
        20,
      ),
    ).rejects.toThrow('request failed');
    expect(vi.getTimerCount()).toBe(0);
    const pending = withBenchmarkTimeout(() => new Promise<void>(() => {}), 20);
    const assertion = expect(pending).rejects.toThrow(
      'Request timed out after 20ms',
    );
    await vi.advanceTimersByTimeAsync(20);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});

it('completes an empty suite and returns an awaitable run', async ({
  bench,
}) => {
  const complete = vi.fn();
  const suite = new VitestBenchmarkSuite(bench).on('complete', complete);
  const execution = suite.run();
  expect(execution).toBeInstanceOf(Promise);
  await execution;
  expect(complete).toHaveBeenCalledOnce();
});
