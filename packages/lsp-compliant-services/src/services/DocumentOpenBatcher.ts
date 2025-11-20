/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
// src/services/document-open-batcher.ts
import { Effect, Ref, Deferred, Fiber, Duration } from 'effect';
import type {
  TextDocumentChangeEvent,
  Diagnostic,
} from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';

/** --- Types the rest of your code can import --- **/

export type DocumentOpenBatcherService = {
  addDocumentOpen(
    ev: TextDocumentChangeEvent<TextDocument>,
  ): Effect.Effect<Diagnostic[] | undefined, Error>;
  forceFlush(): Effect.Effect<void, Error>;
};

// Export type alias for compatibility
export type DocumentOpenBatcher = DocumentOpenBatcherService;

export interface LoggerInterface {
  debug: (msg: () => string) => void;
  info?: (msg: () => string) => void;
  warn?: (msg: () => string) => void;
  error?: (msg: () => string) => void;
}

/**
 * Keep this in sync with your real class-based service.
 * We accept an *instance* so `new DocumentProcessingService(this.logger)` is still valid.
 */
export interface DocumentProcessingService {
  processDocumentOpenInternal: (
    ev: TextDocumentChangeEvent<TextDocument>,
  ) => Promise<Diagnostic[] | undefined>;

  processDocumentOpenBatch: (
    events: TextDocumentChangeEvent<TextDocument>[],
  ) => Promise<(Diagnostic[] | undefined)[]>;
}

/** --- Config --- **/
export interface DocumentOpenBatchConfig {
  batchWindowMs: number;
  batchSizeThreshold: number;
  maxBatchSize: number;
}
export const DEFAULT_BATCH_CONFIG: DocumentOpenBatchConfig = {
  batchWindowMs: 200,
  batchSizeThreshold: 5,
  maxBatchSize: 50,
};

/** --- Internal types --- **/
type PendingItem = {
  event: TextDocumentChangeEvent<TextDocument>;
  deferred: Deferred.Deferred<Diagnostic[] | undefined, Error>;
};

/**
 * Factory effect that creates the batcher service and returns:
 * { service, shutdown }.
 *
 * Example:
 *   const { service, shutdown } = await Effect.runPromise(makeDocumentOpenBatcher(...));
 *
 * The returned `shutdown` effect should be run on test teardown (or app shutdown)
 * to ensure any timer fibers are interrupted and a final flush is attempted.
 */
export const makeDocumentOpenBatcher = (
  logger: LoggerInterface,
  documentProcessingService: DocumentProcessingService,
  config: Partial<DocumentOpenBatchConfig> = {},
) =>
  Effect.gen(function* () {
    const cfg: DocumentOpenBatchConfig = { ...DEFAULT_BATCH_CONFIG, ...config };

    // State
    const pending = yield* Ref.make<PendingItem[]>([]);
    const isFlushing = yield* Ref.make<boolean>(false);
    const timerFiber = yield* Ref.make<Fiber.RuntimeFiber<
      unknown,
      unknown
    > | null>(null);

    /** flushBatch: drains the pending queue and resolves each deferred. */
    const flushBatch = Effect.gen(function* () {
      const alreadyFlushing = yield* Ref.get(isFlushing);
      const items = yield* Ref.get(pending);

      if (alreadyFlushing || items.length === 0) {
        return;
      }

      yield* Ref.set(isFlushing, true);

      // cancel timer (best-effort)
      const tf = yield* Ref.get(timerFiber);
      if (tf) {
        yield* Fiber.interrupt(tf).pipe(Effect.asVoid);
        yield* Ref.set(timerFiber, null);
      }

      // snapshot & clear
      yield* Ref.set(pending, []);
      const batch = [...items];

      // single-item fast path
      if (batch.length === 1) {
        const single = batch[0];
        try {
          const diags = yield* Effect.promise(() =>
            documentProcessingService.processDocumentOpenInternal(single.event),
          );
          yield* Deferred.succeed(single.deferred, diags);
        } catch (e) {
          yield* Deferred.fail(single.deferred, (e as Error) ?? undefined);
        } finally {
          yield* Ref.set(isFlushing, false);
        }
        return;
      }

      // multi-item
      try {
        const events = batch.map((b) => b.event);
        const results = yield* Effect.promise(() =>
          documentProcessingService.processDocumentOpenBatch(events),
        );

        for (let i = 0; i < batch.length; i++) {
          const pendingItem = batch[i];
          if (i < results.length) {
            yield* Deferred.succeed(pendingItem.deferred, results[i]);
          } else {
            // fallback per-item
            logger.warn &&
              logger.warn(
                () =>
                  `Missing result for ${pendingItem.event.document.uri}, falling back to per-item`,
              );
            try {
              const r = yield* Effect.promise(() =>
                documentProcessingService.processDocumentOpenInternal(
                  pendingItem.event,
                ),
              );
              yield* Deferred.succeed(pendingItem.deferred, r);
            } catch (err) {
              yield* Deferred.fail(
                pendingItem.deferred,
                (err as Error) ?? undefined,
              );
            }
          }
        }
      } catch (err) {
        logger.error &&
          logger.error(
            () =>
              `Batch processing failed: ${(err as Error)?.stack ?? String(err)}`,
          );
        for (const pendingItem of batch) {
          yield* Deferred.fail(
            pendingItem.deferred,
            (err as Error) ?? undefined,
          );
        }
        yield* Ref.set(isFlushing, false);
        return;
      }

      yield* Ref.set(isFlushing, false);
    });

    /**
     * startTimer: creates a scoped timer fiber that will call flushBatch after window.
     * We use forkScoped so the fiber is tied to the scope of this Effect — tests can
     * avoid leakage by running this factory inside Effect.scoped / providing the returned
     * shutdown effect.
     */
    const startTimer = Effect.gen(function* () {
      const existing = yield* Ref.get(timerFiber);
      if (existing) {
        yield* Fiber.interrupt(existing).pipe(Effect.asVoid);
      }

      const timerEffect = Effect.sleep(Duration.millis(cfg.batchWindowMs)).pipe(
        Effect.flatMap(() =>
          flushBatch.pipe(
            Effect.catchAll((e) =>
              Effect.sync(() => {
                logger.error &&
                  logger.error(
                    () => `Timer-triggered flush failed: ${String(e)}`,
                  );
              }),
            ),
          ),
        ),
      );

      const fiber = yield* Effect.forkDaemon(timerEffect);
      yield* Ref.set(timerFiber, fiber);
    });

    /**
     * Public API: addDocumentOpen returns an Effect resolving to diagnostics for that document.
     */
    const addDocumentOpen = (
      ev: TextDocumentChangeEvent<TextDocument>,
    ): Effect.Effect<Diagnostic[] | undefined, Error> =>
      Effect.gen(function* () {
        const deferred = yield* Deferred.make<
          Diagnostic[] | undefined,
          Error
        >();

        // If currently flushing, do single processing immediately so caller doesn't wait
        const flushing = yield* Ref.get(isFlushing);
        if (flushing) {
          const diags = yield* Effect.promise(() =>
            documentProcessingService.processDocumentOpenInternal(ev),
          ).pipe(Effect.catchAll((e) => Effect.fail(e as Error)));
          return diags;
        }

        // Append to pending
        yield* Ref.update(pending, (list) => [
          ...list,
          { event: ev, deferred },
        ]);

        // Compute size
        const size = yield* Ref.get(pending).pipe(Effect.map((p) => p.length));

        if (size >= cfg.batchSizeThreshold || size >= cfg.maxBatchSize) {
          yield* flushBatch;
        } else if (size === 1 && cfg.batchSizeThreshold > 1) {
          yield* startTimer;
        }

        const result = yield* Deferred.await(deferred);
        return result;
      });

    const forceFlush = (): Effect.Effect<void, Error> =>
      flushBatch.pipe(Effect.asVoid);

    /** Public service object */
    const service: DocumentOpenBatcherService = {
      addDocumentOpen,
      forceFlush,
    };

    /** shutdown effect: interrupt timer fiber and attempt a final flush */
    const shutdown: Effect.Effect<void, never> = Effect.gen(function* () {
      const tf = yield* Ref.get(timerFiber);
      if (tf) {
        yield* Fiber.interrupt(tf).pipe(Effect.asVoid);
        yield* Ref.set(timerFiber, null);
      }
      yield* flushBatch.pipe(Effect.catchAll(() => Effect.void));
    });

    return { service, shutdown };
  });
