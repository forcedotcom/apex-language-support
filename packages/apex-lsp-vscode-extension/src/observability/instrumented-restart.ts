/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect, pipe } from 'effect';
import * as vscode from 'vscode';
import {
  withSpan,
  writeMetric,
  writeLog,
  writeTrace,
  flush,
  writeLogWithContext,
  TelemetryLive,
  TelemetryService,
} from './telemetry-layer';
import {
  createTelemetryMetric,
  createTelemetryLog,
  createTelemetryTrace,
  createRestartServerError,
  RestartServerError,
} from './schemas';
import { startLanguageServer } from '../language-server';

/**
 * Effect.ts instrumented restart language server function
 */
export const effectRestartLanguageServer = (
  context: vscode.ExtensionContext,
  restartHandler: (context: vscode.ExtensionContext) => Promise<void>,
): Effect.Effect<void, RestartServerError, TelemetryService> =>
  pipe(
    withSpan(
      'restart-language-server',
      Effect.gen(function* (_) {
        // Log start of restart operation (with automatic trace context)
        yield* _(
          writeLogWithContext('Starting Apex Language Server restart', 'info', {
            operation: 'restart-language-server',
            phase: 'start',
          }),
        );

        // Increment restart counter metric
        yield* _(
          writeMetric(
            createTelemetryMetric({
              name: 'restarts.count',
              type: 'counter',
              value: 1,
              timestamp: new Date().toISOString(),
              attributes: { operation: 'restart-language-server' },
              unit: 'count',
            }),
          ),
        );

        // Sub-operation: Stop existing client
        yield* _(
          withSpan(
            'stop-client',
            Effect.gen(function* (_) {
              yield* _(
                writeLogWithContext(
                  'Stopping existing language server client',
                  'info',
                  { operation: 'stop-client' },
                ),
              );

              // Call the original startLanguageServer which handles stopping existing client
              yield* _(
                Effect.tryPromise({
                  try: async () => {
                    await startLanguageServer(context, restartHandler);
                  },
                  catch: (error) =>
                    createRestartServerError(
                      'StartClientFailed',
                      error instanceof Error ? error.message : String(error),
                      error,
                      {
                        errorMessage:
                          error instanceof Error
                            ? error.message
                            : String(error),
                        errorType:
                          error instanceof Error
                            ? error.constructor.name
                            : 'Unknown',
                      },
                    ),
                }),
              );
            }),
          ),
        );

        // Log successful completion (with automatic trace context)
        yield* _(
          writeLogWithContext(
            'Apex Language Server restart completed successfully',
            'info',
            {
              operation: 'restart-language-server',
              phase: 'complete',
              success: true,
            },
          ),
        );

        // Success metric
        yield* _(
          writeMetric(
            createTelemetryMetric({
              name: 'restarts.success.count',
              type: 'counter',
              value: 1,
              timestamp: new Date().toISOString(),
              attributes: { operation: 'restart-language-server' },
              unit: 'count',
            }),
          ),
        );
      }),
    ),
    Effect.catchAll((error: RestartServerError) =>
      Effect.gen(function* (_) {
        // Error metric
        yield* _(
          writeMetric(
            createTelemetryMetric({
              name: 'restarts.errors.count',
              type: 'counter',
              value: 1,
              timestamp: new Date().toISOString(),
              attributes: {
                operation: 'restart-language-server',
                errorType: error.reason,
              },
              unit: 'count',
            }),
          ),
        );

        // Re-throw the error
        return yield* _(Effect.fail(error));
      }),
    ),
    Effect.ensuring(
      pipe(
        flush(),
        Effect.tap(() =>
          Effect.sync(() => {
            console.log('[EFFECT TELEMETRY] Telemetry data flushed to files');
          }),
        ),
        Effect.orElse(() =>
          Effect.sync(() => {
            console.error('[EFFECT TELEMETRY] Failed to flush telemetry data');
          }),
        ),
      ),
    ),
  );

/**
 * Wrapper function that runs the Effect.ts instrumentation
 */
export const runEffectRestartLanguageServer = async (
  context: vscode.ExtensionContext,
  restartHandler: (context: vscode.ExtensionContext) => Promise<void>,
): Promise<void> => {
  const program = pipe(
    Effect.gen(function* (_) {
      // Log the start of Effect.ts instrumentation as structured telemetry
      yield* _(
        writeLogWithContext('Starting Effect.ts instrumented restart', 'info', {
          'instrumentation.type': 'effect-ts',
          'operation.type': 'restart-language-server',
          'operation.mode': 'instrumented',
        }),
      );

      // Execute the main restart operation
      yield* _(effectRestartLanguageServer(context, restartHandler));
    }),
    Effect.provide(TelemetryLive),
    Effect.orDie, // Convert errors to exceptions for Promise compatibility
  );

  return Effect.runPromise(program);
};

/**
 * Error simulation restart using Effect.ts patterns
 */
export const simulatedErrorRestart = (
  context: vscode.ExtensionContext,
  restartHandler: (context: vscode.ExtensionContext) => Promise<void>,
): Effect.Effect<void, RestartServerError, TelemetryService> =>
  pipe(
    withSpan(
      'restart-language-server',
      Effect.gen(function* (_) {
        // Log start of restart operation
        yield* _(
          writeLogWithContext(
            'Starting Apex Language Server restart (ERROR SIMULATION)',
            'info',
            {
              operation: 'restart-language-server',
              phase: 'start',
              simulatedError: true,
            },
          ),
        );

        // Increment restart counter metric
        yield* _(
          writeMetric(
            createTelemetryMetric({
              name: 'restarts.count',
              type: 'counter',
              value: 1,
              timestamp: new Date().toISOString(),
              attributes: { operation: 'restart-language-server' },
              unit: 'count',
            }),
          ),
        );

        // Note: withSpan will automatically create the main trace
        // No manual trace creation needed - withSpan handles trace generation

        // Sub-operation: Stop existing client (simulate this succeeds)
        yield* _(
          withSpan(
            'stop-client',
            Effect.gen(function* (_) {
              yield* _(
                writeLogWithContext(
                  'Stopping existing language server client (simulated)',
                  'info',
                  { operation: 'stop-client' },
                ),
              );

              // Simulate stop client working
              yield* _(Effect.sleep('50 millis'));

              // Note: withSpan will automatically create the stop-client trace
              // No manual trace creation needed - withSpan handles trace generation
            }),
          ),
        );

        // Sub-operation: Start client (simulate this fails)
        yield* _(
          withSpan(
            'start-client',
            Effect.gen(function* (_) {
              yield* _(
                writeLogWithContext(
                  'Attempting to start language server client (will fail)',
                  'warn',
                  { operation: 'start-client' },
                ),
              );

              // Simulate delay then fail
              yield* _(Effect.sleep('100 millis'));

              // Log that we're about to fail
              yield* _(
                writeLogWithContext('Simulating error failure now', 'error', {
                  operation: 'start-client',
                  simulationStep: 'about-to-fail',
                  errorType: 'StartClientFailed',
                }),
              );

              // Create the error
              const error = createRestartServerError(
                'StartClientFailed',
                'Language server binary not found at expected path',
                undefined,
                {
                  simulationDetails:
                    'This is a simulated error for demonstration purposes',
                  expectedBehavior: 'Real errors would be handled identically',
                },
              );

              // Note: withSpan will automatically create the error trace
              // No manual trace creation needed - withSpan handles trace generation

              yield* _(Effect.fail(error));
            }),
          ),
        );
      }),
    ),
    Effect.catchAll((error: RestartServerError) =>
      Effect.gen(function* (_) {
        // Error metric
        yield* _(
          writeMetric(
            createTelemetryMetric({
              name: 'restarts.errors.count',
              type: 'counter',
              value: 1,
              timestamp: new Date().toISOString(),
              attributes: {
                operation: 'restart-language-server',
                errorType: error.reason,
                isSimulated: 'true',
              },
              unit: 'count',
            }),
          ),
        );

        // Re-throw the error
        return yield* _(Effect.fail(error));
      }),
    ),
    Effect.ensuring(
      pipe(
        flush(),
        Effect.tap(() =>
          Effect.sync(() => {
            console.log(
              '[EFFECT TELEMETRY] Error simulation telemetry data flushed',
            );
          }),
        ),
        Effect.orElse(() =>
          Effect.sync(() => {
            console.error(
              '[EFFECT TELEMETRY] Failed to flush error telemetry data',
            );
          }),
        ),
      ),
    ),
  );

/**
 * Run error simulation using Effect.ts
 */
export const runSimulatedErrorRestart = async (
  context: vscode.ExtensionContext,
  restartHandler: (context: vscode.ExtensionContext) => Promise<void>,
): Promise<void> => {
  console.log('[ERROR SIMULATION] Starting Effect.ts error simulation...');

  const program = pipe(
    Effect.gen(function* (_) {
      // Log the start of error simulation
      yield* _(
        writeLogWithContext('Starting error simulation', 'info', {
          'simulation.type': 'error-demo',
          'operation.type': 'restart-language-server',
          'operation.mode': 'error-simulation',
        }),
      );

      console.log('[ERROR SIMULATION] Executing simulated error restart...');
      // Execute the simulated error restart
      yield* _(simulatedErrorRestart(context, restartHandler));
    }),
    Effect.provide(TelemetryLive),
    Effect.orDie, // Convert errors to exceptions for Promise compatibility
  );

  try {
    await Effect.runPromise(program);
    console.log(
      '[ERROR SIMULATION] Unexpected: Error simulation completed successfully',
    );
  } catch (error) {
    console.log('[ERROR SIMULATION] Expected error caught:', error);
    throw error; // Re-throw for the calling code to handle
  }
};
