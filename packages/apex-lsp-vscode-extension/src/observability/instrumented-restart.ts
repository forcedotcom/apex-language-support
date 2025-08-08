/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import * as vscode from 'vscode';
import {
  writeMetric,
  logWithTracing,
  flush,
  recordOperationMetric,
  TelemetryLive,
  TelemetryService,
} from './telemetry-layer';
import {
  createTelemetryMetric,
  createRestartServerError,
  RestartServerError,
} from './schemas';
import { startLanguageServer } from '../language-server';
import {
  withOpenTelemetrySpan,
  logWithOpenTelemetryContext,
} from './opentelemetry-integration';

/**
 * Effect.ts instrumented restart language server function
 */
export const effectRestartLanguageServer = (
  context: vscode.ExtensionContext,
  restartHandler: (context: vscode.ExtensionContext) => Promise<void>,
): Effect.Effect<void, RestartServerError, TelemetryService> => {
  const mainOperation = Effect.gen(function* (_) {
    const startTime = performance.now();

    // Log start of restart operation with OpenTelemetry context
    yield* _(
      logWithOpenTelemetryContext(
        'Starting Apex Language Server restart',
        'info',
        {
          operation: 'restart-language-server',
          phase: 'start',
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

    // Sub-operation: Start language server with OpenTelemetry tracing
    const startServerOperation = Effect.gen(function* (_) {
      yield* _(
        logWithOpenTelemetryContext('Starting language server client', 'info', {
          operation: 'start-language-server',
        }),
      );

      // Call the original startLanguageServer which handles stopping existing client
      yield* _(
        Effect.tryPromise({
          try: () => startLanguageServer(context, restartHandler),
          catch: (error) =>
            createRestartServerError(
              'StartClientFailed',
              error instanceof Error ? error.message : String(error),
              error,
              {
                errorMessage:
                  error instanceof Error ? error.message : String(error),
                errorType:
                  error instanceof Error ? error.constructor.name : 'Unknown',
              },
            ),
        }),
      );
    });

    // Use OpenTelemetry span for the start server operation
    yield* _(
      withOpenTelemetrySpan('start-language-server', {
        operation: 'start-language-server',
        component: 'language-server',
      })(startServerOperation),
    );

    // Record operation duration
    const duration = Math.round((performance.now() - startTime) * 100) / 100;
    yield* _(recordOperationMetric('restart-language-server', duration, true));

    // Log successful completion with OpenTelemetry context
    yield* _(
      logWithOpenTelemetryContext(
        'Apex Language Server restart completed successfully',
        'info',
        {
          operation: 'restart-language-server',
          phase: 'complete',
          success: true,
          duration,
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
  });

  const operationWithErrorHandling = Effect.catchAll(
    mainOperation,
    (error: RestartServerError) =>
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
  );

  return Effect.ensuring(operationWithErrorHandling, flush());
};

/**
 * Wrapper function that runs the Effect.ts instrumentation
 */
export const runEffectRestartLanguageServer = async (
  context: vscode.ExtensionContext,
  restartHandler: (context: vscode.ExtensionContext) => Promise<void>,
): Promise<void> => {
  const mainProgram = Effect.gen(function* (_) {
    // Execute the main restart operation
    yield* _(effectRestartLanguageServer(context, restartHandler));
  });
  const programWithServices = Effect.provide(mainProgram, TelemetryLive);
  const programOrDie = Effect.orDie(programWithServices); // Convert errors to exceptions for Promise compatibility

  return Effect.runPromise(programOrDie);
};

/**
 * Error simulation restart using Effect.ts patterns
 */
export const simulatedErrorRestart = (
  context: vscode.ExtensionContext,
  restartHandler: (context: vscode.ExtensionContext) => Promise<void>,
): Effect.Effect<void, RestartServerError, TelemetryService> => {
  const mainSimulation = Effect.gen(function* (_) {
    // Log start of restart operation
    yield* _(
      logWithTracing(
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

    // Sub-operation: Stop existing client (simulate this succeeds)
    const stopClientOperation = Effect.gen(function* (_) {
      yield* _(
        logWithTracing(
          'Stopping existing language server client (simulated)',
          'info',
          { operation: 'stop-client' },
        ),
      );

      // Simulate stop client working
      yield* _(Effect.sleep('50 millis'));
    });

    yield* _(
      Effect.withSpan('stop-client-simulation', {
        attributes: {
          operation: 'stop-client',
          simulation: true,
        },
      })(stopClientOperation),
    );

    // Sub-operation: Start client (simulate this fails)
    const startClientOperation = Effect.gen(function* (_) {
      yield* _(
        logWithTracing(
          'Attempting to start language server client (will fail)',
          'warn',
          { operation: 'start-client' },
        ),
      );

      // Simulate delay then fail
      yield* _(Effect.sleep('100 millis'));

      // Log that we're about to fail
      yield* _(
        logWithTracing('Simulating error failure now', 'error', {
          operation: 'start-client',
          simulationStep: 'about-to-fail',
          errorType: 'StartClientFailed',
        }),
      );

      // Create and throw the error
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

      yield* _(Effect.fail(error));
    });

    yield* _(
      Effect.withSpan('start-client-simulation', {
        attributes: {
          operation: 'start-client',
          simulation: true,
        },
      })(startClientOperation),
    );
  });

  const tracedSimulation = Effect.withSpan(
    'restart-language-server-simulation',
    {
      attributes: {
        operation: 'restart-language-server',
        component: 'language-server',
        simulatedError: true,
      },
    },
  )(mainSimulation);

  const simulationWithErrorHandling = Effect.catchAll(
    tracedSimulation,
    (error: RestartServerError) =>
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
  );

  return Effect.ensuring(simulationWithErrorHandling, flush());
};

/**
 * Run error simulation using Effect.ts
 */
export const runSimulatedErrorRestart = async (
  context: vscode.ExtensionContext,
  restartHandler: (context: vscode.ExtensionContext) => Promise<void>,
): Promise<void> => {
  console.log('[ERROR SIMULATION] Starting Effect.ts error simulation...');

  const mainProgram = Effect.gen(function* (_) {
    // Log the start of error simulation
    yield* _(
      logWithTracing('Starting error simulation', 'info', {
        'simulation.type': 'error-demo',
        'operation.type': 'restart-language-server',
        'operation.mode': 'error-simulation',
      }),
    );

    console.log('[ERROR SIMULATION] Executing simulated error restart...');
    // Execute the simulated error restart
    yield* _(simulatedErrorRestart(context, restartHandler));
  });

  const programWithServices = Effect.provide(mainProgram, TelemetryLive);
  const programOrDie = Effect.orDie(programWithServices); // Convert errors to exceptions for Promise compatibility

  try {
    await Effect.runPromise(programOrDie);
    console.log(
      '[ERROR SIMULATION] Unexpected: Error simulation completed successfully',
    );
  } catch (error) {
    console.log('[ERROR SIMULATION] Expected error caught:', error);
    throw error; // Re-throw for the calling code to handle
  }
};
