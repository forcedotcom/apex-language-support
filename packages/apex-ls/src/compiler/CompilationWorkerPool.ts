/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as Worker from '@effect/platform/Worker';
import { Context, Deferred, Duration, Effect } from 'effect';
import type {
  CompilationWorkerRequest,
  CompileApexFile,
  CompileApexFileSuccess,
} from '@salesforce/apex-lsp-shared';

export interface CompilationWorkerPoolService {
  readonly size: number;
  readonly concurrency: number;
  readonly available: boolean;
  readonly execute: (
    request: CompileApexFile,
    priority?: CompilationPriority,
  ) => Effect.Effect<CompileApexFileSuccess, unknown>;
}

export type CompilationPriority = 'high' | 'low';

type AdmissionWaiter = {
  state: 'queued' | 'granted' | 'acquired' | 'released' | 'cancelled';
  readonly resume: (effect: Effect.Effect<AdmissionWaiter>) => void;
};

export const CompilationWorkerPool =
  Context.GenericTag<CompilationWorkerPoolService>(
    '@salesforce/apex-ls/CompilationWorkerPool',
  );

export function makeSerializedWorkerPoolReadiness(expectedWorkers: number) {
  return Effect.gen(function* () {
    const ready = yield* Deferred.make<void>();
    const expected = Math.max(1, expectedWorkers);
    let initialized = 0;

    const onCreate = (_worker?: unknown) =>
      Effect.suspend(() => {
        initialized += 1;
        return initialized >= expected
          ? Deferred.succeed(ready, undefined).pipe(Effect.asVoid)
          : Effect.void;
      });

    const awaitReady = Deferred.await(ready);

    return { onCreate, awaitReady, initialized: () => initialized } as const;
  });
}

export function withCompilationWorkerStartupTimeout<A, E, R>(
  startup: Effect.Effect<A, E, R>,
  initializedWorkers: () => number,
  expectedWorkers: number,
  timeout: Duration.DurationInput = '30 seconds',
): Effect.Effect<A, E | Error, R> {
  return startup.pipe(
    Effect.disconnect,
    Effect.timeoutFail({
      duration: timeout,
      onTimeout: () =>
        new Error(
          'Compilation worker pool startup timed out: ' +
            `${initializedWorkers()}/${expectedWorkers} workers initialized`,
        ),
    }),
  );
}

export function fromSerializedWorkerPool(
  pool: Worker.SerializedWorkerPool<CompilationWorkerRequest>,
  size: number,
  concurrency: number,
): CompilationWorkerPoolService {
  let availablePermits = Math.max(1, size);
  const highWaiters: AdmissionWaiter[] = [];
  const lowWaiters: AdmissionWaiter[] = [];

  const nextWaiter = (): AdmissionWaiter | undefined => {
    let waiter: AdmissionWaiter | undefined;
    while ((waiter = highWaiters.shift())) {
      if (waiter.state === 'queued') return waiter;
    }
    while ((waiter = lowWaiters.shift())) {
      if (waiter.state === 'queued') return waiter;
    }
    return undefined;
  };

  const releasePermit = () => {
    const waiter = nextWaiter();
    if (waiter) {
      // Reserve the released permit before resuming the waiter. A new
      // background request therefore cannot barge ahead while Effect schedules
      // the waiting fiber.
      waiter.state = 'granted';
      waiter.resume(Effect.succeed(waiter));
      return;
    }
    availablePermits += 1;
  };

  const acquirePermit = (priority: CompilationPriority) =>
    Effect.async<AdmissionWaiter>((resume) => {
      const waiter: AdmissionWaiter = { state: 'queued', resume };
      if (availablePermits > 0) {
        availablePermits -= 1;
        waiter.state = 'granted';
        resume(Effect.succeed(waiter));
      } else {
        (priority === 'high' ? highWaiters : lowWaiters).push(waiter);
      }

      return Effect.sync(() => {
        if (waiter.state === 'queued') {
          waiter.state = 'cancelled';
        } else if (waiter.state === 'granted') {
          waiter.state = 'cancelled';
          releasePermit();
        }
      });
    });

  const execute = (
    request: CompileApexFile,
    priority: CompilationPriority = 'low',
  ) =>
    Effect.suspend(() => {
      const admissionStart = performance.now();
      return Effect.uninterruptibleMask((restore) =>
        restore(acquirePermit(priority)).pipe(
          Effect.tap((waiter) =>
            Effect.sync(() => {
              waiter.state = 'acquired';
            }).pipe(
              Effect.zipRight(
                Effect.annotateCurrentSpan({
                  'compilation.priority': priority,
                  'compilation.admission_wait_ms':
                    performance.now() - admissionStart,
                  'compilation.worker_count': size,
                  'compilation.concurrency_per_worker': concurrency,
                }),
              ),
            ),
          ),
          Effect.flatMap((waiter) =>
            restore(pool.executeEffect(request)).pipe(
              Effect.ensuring(
                Effect.sync(() => {
                  if (waiter.state === 'acquired') {
                    waiter.state = 'released';
                    releasePermit();
                  }
                }),
              ),
            ),
          ),
        ),
      ).pipe(
        Effect.withSpan('compilation.pool.execute', {
          attributes: {
            'document.uri': request.uri,
            'document.version': request.version,
            'compilation.priority': priority,
          },
        }),
      );
    });

  return {
    size,
    concurrency,
    available: true,
    execute,
  };
}

export const unavailableCompilationWorkerPool: CompilationWorkerPoolService = {
  size: 0,
  concurrency: 0,
  available: false,
  execute: () =>
    Effect.fail(
      new Error(
        'The data-owner-managed compilation pool is unavailable on this platform',
      ),
    ),
};
