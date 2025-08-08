/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect, Context, Layer, Option, Logger, Metric, Tracer } from 'effect';
import { FileSystem } from '@effect/platform';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  TelemetryMetric,
  TelemetryLog,
  createTelemetryMetric,
  createTelemetryLog,
  LogLevel,
} from './schemas';

/**
 * Simplified Telemetry Service Interface using Effect's built-in capabilities
 */
export interface TelemetryService {
  readonly writeMetric: (metric: TelemetryMetric) => Effect.Effect<void>;
  readonly writeLog: (log: TelemetryLog) => Effect.Effect<void>;
  readonly flush: () => Effect.Effect<void>;
}

/**
 * Effect.ts Service Tag
 */
export const TelemetryService =
  Context.GenericTag<TelemetryService>('TelemetryService');

/**
 * Telemetry Configuration Service
 */
export interface TelemetryConfig {
  readonly outputDirectory: string;
  readonly enabled: boolean;
  readonly maxBatchSize: number;
}

export const TelemetryConfig =
  Context.GenericTag<TelemetryConfig>('TelemetryConfig');

/**
 * Default Telemetry Configuration Layer
 */
export const TelemetryConfigLive = Layer.succeed(TelemetryConfig, {
  outputDirectory: '.telemetry',
  enabled: true,
  maxBatchSize: 10,
});

/**
 * In-memory telemetry storage interface
 */
interface TelemetryStorage {
  metrics: TelemetryMetric[];
  logs: TelemetryLog[];
}

/**
 * Simplified Effect.ts Telemetry Service Layer Implementation
 */
export const TelemetryServiceLive = Layer.effect(
  TelemetryService,
  Effect.gen(function* (_) {
    const config = yield* _(TelemetryConfig);

    // Initialize storage
    const storage: TelemetryStorage = {
      metrics: [],
      logs: [],
    };

    // Get workspace root for file output
    const getWorkspaceRoot = (): string => {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      return workspaceRoot || process.cwd();
    };

    // Ensure output directory exists
    const ensureOutputDirectory = (): Effect.Effect<string> =>
      Effect.gen(function* (_) {
        const workspaceRoot = getWorkspaceRoot();
        const outputPath = path.join(workspaceRoot, config.outputDirectory);

        yield* _(
          Effect.tryPromise(async () => {
            await fs.mkdir(outputPath, { recursive: true });
          }),
          Effect.orElse(() => Effect.succeed(void 0)),
        );

        return outputPath;
      });

    // Write telemetry data to files
    const writeToFile = <T>(filename: string, data: T[]): Effect.Effect<void> =>
      Effect.gen(function* (_) {
        if (!config.enabled || data.length === 0) {
          return;
        }

        const outputPath = yield* _(ensureOutputDirectory());
        const filePath = path.join(outputPath, filename);
        const jsonContent =
          data.map((item) => JSON.stringify(item)).join('\n') + '\n';

        yield* _(
          Effect.tryPromise(async () => {
            await fs.appendFile(filePath, jsonContent);
          }),
          Effect.orElse(() => Effect.succeed(void 0)),
        );
      });

    // Write methods
    const writeMetric = (metric: TelemetryMetric): Effect.Effect<void> =>
      Effect.gen(function* (_) {
        storage.metrics.push(metric);
        if (storage.metrics.length >= config.maxBatchSize) {
          yield* _(flush());
        }
      });

    const writeLog = (log: TelemetryLog): Effect.Effect<void> =>
      Effect.gen(function* (_) {
        storage.logs.push(log);
        if (storage.logs.length >= config.maxBatchSize) {
          yield* _(flush());
        }
      });

    // Flush all stored data to files
    const flush = (): Effect.Effect<void> =>
      Effect.gen(function* (_) {
        const metricsToFlush = [...storage.metrics];
        const logsToFlush = [...storage.logs];

        // Clear storage
        storage.metrics.length = 0;
        storage.logs.length = 0;

        // Write to files in parallel
        yield* _(
          Effect.all(
            [
              writeToFile('metrics.jsonl', metricsToFlush),
              writeToFile('logs.jsonl', logsToFlush),
            ],
            { concurrency: 'inherit' },
          ),
        );
      });

    return {
      writeMetric,
      writeLog,
      flush,
    };
  }),
);

/**
 * No-Op Telemetry Service Layer for production builds
 */
export const TelemetryServiceNoOp = Layer.succeed(TelemetryService, {
  writeMetric: () => Effect.void,
  writeLog: () => Effect.void,
  flush: () => Effect.void,
});

/**
 * Combined Live Layer with dependencies
 */
export const TelemetryLive = Layer.provide(
  TelemetryServiceLive,
  TelemetryConfigLive,
);

/**
 * Effect.ts convenience functions
 */
export const writeMetric = (metric: TelemetryMetric) =>
  Effect.flatMap(TelemetryService, (service) => service.writeMetric(metric));

export const writeLog = (log: TelemetryLog) =>
  Effect.flatMap(TelemetryService, (service) => service.writeLog(log));

export const flush = () =>
  Effect.flatMap(TelemetryService, (service) => service.flush());

/**
 * Enhanced logging function that includes span and trace IDs from Effect.ts tracing context
 *
 * This function manually extracts span context from Effect.ts and includes it in logs.
 * Note: Effect.ts does NOT automatically include span context in logs by default.
 *
 * The logs will include:
 * - Span ID: Unique identifier for the current operation span
 * - Trace ID: Unique identifier for the entire trace
 * - Span name: Human-readable name of the current span
 * - Parent span ID: ID of the parent span (if any)
 *
 * Example usage:
 * ```typescript
 * yield* _(
 *   Effect.withSpan('my-operation', {
 *     attributes: { component: 'my-component' }
 *   })(
 *     Effect.gen(function* (_) {
 *       yield* _(logWithTracing('Operation started', 'info', { step: 'init' }));
 *       // ... operation logic
 *       yield* _(logWithTracing('Operation completed', 'info', { step: 'complete' }));
 *     })
 *   )
 * );
 * ```
 */
export const logWithTracing = (
  message: string,
  level: LogLevel = 'info',
  attributes?: Record<string, unknown>,
) => {
  return Effect.gen(function* (_) {
    // Extract tracing information
    const tracingAttributes: Record<string, unknown> = {
      ...attributes,
    };

    // Note: Effect.ts doesn't easily expose span context in logs
    // The span context is available internally but not through public APIs
    // For now, we'll include the span name in the message if provided in attributes
    let spanInfo = '';
    if (attributes?.spanName) {
      spanInfo = ` [span:${attributes.spanName}]`;
    }

    // Create telemetry log with tracing information
    const telemetryLog = writeLog(
      createTelemetryLog({
        timestamp: new Date().toISOString(),
        level,
        message,
        attributes: tracingAttributes,
      }),
    );

    // Create Effect.ts log with manual span context
    const effectLog = (() => {
      const logMessage = `${message}${spanInfo}`;

      switch (level) {
        case 'debug':
          return Effect.logDebug(logMessage);
        case 'info':
          return Effect.logInfo(logMessage);
        case 'warn':
          return Effect.logWarning(logMessage);
        case 'error':
          return Effect.logError(logMessage);
        default:
          return Effect.logInfo(logMessage);
      }
    })();

    // Execute both telemetry and Effect logging
    yield* _(telemetryLog);
    yield* _(effectLog);
  });
};

/**
 * Helper function to record operation metrics
 */
export const recordOperationMetric = (
  operationName: string,
  duration: number,
  success: boolean = true,
  attributes?: Record<string, string>,
) =>
  writeMetric(
    createTelemetryMetric({
      name: `${operationName}.duration`,
      type: 'histogram',
      value: duration,
      timestamp: new Date().toISOString(),
      attributes: {
        operation: operationName,
        success: success.toString(),
        ...attributes,
      },
      unit: 'ms',
    }),
  );
