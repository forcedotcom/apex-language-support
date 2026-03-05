/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect, Ref, Fiber, Duration } from 'effect';
import type { Connection } from 'vscode-languageserver';

/**
 * Service that sends a debounced `workspace/diagnostic/refresh` to the client
 * after async enrichment completes, so the client re-pulls diagnostics with
 * fully enriched symbol tables.
 *
 * Guards:
 * - `diagnosticsEnabled`: false when `diagnosticProvider` capability is absent
 *   (production mode, web platform). Set via `setDiagnosticsEnabled()`.
 * - `clientSupportsRefresh`: false when the client did not advertise
 *   `workspace.diagnostics.refreshSupport` in `InitializeParams`. Set via
 *   `setClientSupportsRefresh()`.
 * - `connection`: must be set before any refresh can be sent.
 *
 * Debouncing collapses rapid calls (e.g. batch file-open) into a single refresh
 * after the last enrichment settles.
 */
export class DiagnosticRefreshService {
  private static instance: DiagnosticRefreshService | null = null;

  private connection: Connection | null = null;
  private diagnosticsEnabled = false;
  private clientSupportsRefresh = false;
  private readonly debounceMs: number;

  // Effect-managed timer fiber — initialized synchronously at construction time
  private readonly pendingFiber: Ref.Ref<Fiber.RuntimeFiber<
    unknown,
    unknown
  > | null>;

  private constructor(debounceMs = 250) {
    this.debounceMs = debounceMs;
    this.pendingFiber = Effect.runSync(
      Ref.make<Fiber.RuntimeFiber<unknown, unknown> | null>(null),
    );
  }

  static getInstance(): DiagnosticRefreshService {
    if (!DiagnosticRefreshService.instance) {
      DiagnosticRefreshService.instance = new DiagnosticRefreshService();
    }
    return DiagnosticRefreshService.instance;
  }

  /** Reset singleton — for testing only. */
  static reset(): void {
    DiagnosticRefreshService.instance = null;
  }

  /**
   * Set the LSP connection used to send the refresh request.
   * Must be called before any refresh can fire.
   */
  setConnection(connection: Connection): void {
    this.connection = connection;
  }

  /**
   * Enable or disable the refresh signal based on whether the server has
   * a `diagnosticProvider` capability (i.e. diagnostics are active).
   * Pass `false` for production mode or web platform.
   */
  setDiagnosticsEnabled(enabled: boolean): void {
    this.diagnosticsEnabled = enabled;
  }

  /**
   * Set whether the client advertised `workspace.diagnostics.refreshSupport`
   * in its `InitializeParams`. Per the LSP spec, the server must not send
   * `workspace/diagnostic/refresh` unless the client supports it.
   */
  setClientSupportsRefresh(supported: boolean): void {
    this.clientSupportsRefresh = supported;
  }

  /**
   * Signal that enrichment has completed for a file.
   * Starts (or resets) a debounce timer; when it expires, sends
   * `workspace/diagnostic/refresh` to the client.
   *
   * Is a no-op when any guard condition is unmet.
   */
  signalEnrichmentComplete(): Effect.Effect<void, never, never> {
    const self = this;
    return Effect.gen(function* () {
      if (
        !self.connection ||
        !self.diagnosticsEnabled ||
        !self.clientSupportsRefresh
      ) {
        yield* Effect.logDebug(
          'DiagnosticRefreshService: skipping refresh ' +
            `(connected=${!!self.connection}, ` +
            `diagnosticsEnabled=${self.diagnosticsEnabled}, ` +
            `clientSupportsRefresh=${self.clientSupportsRefresh})`,
        );
        return;
      }

      // Cancel any existing debounce timer before starting a new one
      const existing = yield* Ref.get(self.pendingFiber);
      if (existing) {
        yield* Fiber.interrupt(existing).pipe(Effect.asVoid);
      }

      // Fork debounce timer as a daemon so it outlives the current fiber scope
      const timerEffect = Effect.sleep(Duration.millis(self.debounceMs)).pipe(
        Effect.andThen(
          Effect.sync(() => {
            try {
              self.connection?.languages.diagnostics.refresh();
            } catch {
              // Ignore errors from the refresh call — client may have disconnected
            }
          }),
        ),
        // Clear the ref once the timer fires
        Effect.andThen(Ref.set(self.pendingFiber, null)),
      );

      const fiber = yield* Effect.forkDaemon(timerEffect);
      yield* Ref.set(self.pendingFiber, fiber);

      yield* Effect.logDebug(
        `DiagnosticRefreshService: debounce timer started (${self.debounceMs}ms)`,
      );
    });
  }
}

/**
 * Convenience accessor for the module-level singleton.
 */
export function getDiagnosticRefreshService(): DiagnosticRefreshService {
  return DiagnosticRefreshService.getInstance();
}
