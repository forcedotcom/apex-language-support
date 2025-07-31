/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect, Context, Layer, pipe, Option, FiberRef } from 'effect';
import { FileSystem } from '@effect/platform';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  TelemetryTrace,
  TelemetryMetric,
  TelemetryLog,
  createTelemetryTrace,
  createTelemetryMetric,
  createTelemetryLog,
} from './schemas';

/**
 * Trace Context for Effect.ts based tracing
 */
export interface TraceContext {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
}

/**
 * Current Trace Context FiberRef
 */
export const CurrentTraceContext = FiberRef.unsafeMake<
  Option.Option<TraceContext>
>(Option.none());

/**
 * Effect.ts Telemetry Service Interface
 */
export interface TelemetryService {
  readonly writeTrace: (trace: TelemetryTrace) => Effect.Effect<void>;
  readonly writeMetric: (metric: TelemetryMetric) => Effect.Effect<void>;
  readonly writeLog: (log: TelemetryLog) => Effect.Effect<void>;
  readonly flush: () => Effect.Effect<void>;
  readonly generateTraceId: () => string;
  readonly generateSpanId: () => string;
  readonly getCurrentTraceContext: () => Effect.Effect<
    Option.Option<TraceContext>
  >;
  readonly withTraceContext: <A, E, R>(
    context: TraceContext,
    operation: Effect.Effect<A, E, R>,
  ) => Effect.Effect<A, E, R>;
  readonly writeLogWithContext: (
    message: string,
    level: 'debug' | 'info' | 'warn' | 'error',
    attributes?: Record<string, unknown>,
  ) => Effect.Effect<void>;
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
  readonly flushInterval: number; // milliseconds
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
  flushInterval: 5000,
  maxBatchSize: 10,
});

/**
 * In-memory telemetry storage interface
 */
interface TelemetryStorage {
  traces: TelemetryTrace[];
  metrics: TelemetryMetric[];
  logs: TelemetryLog[];
}

/**
 * Effect.ts Telemetry Service Layer Implementation
 */
export const TelemetryServiceLive = Layer.effect(
  TelemetryService,
  Effect.gen(function* (_) {
    const config = yield* _(TelemetryConfig);

    // Initialize storage
    const storage: TelemetryStorage = {
      traces: [],
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

        console.log(
          `[EFFECT TELEMETRY] Creating telemetry directory: ${outputPath}`,
        );

        yield* _(
          Effect.tryPromise(async () => {
            await fs.mkdir(outputPath, { recursive: true });
          }),
          Effect.orElse(() => Effect.succeed(void 0)), // Ignore errors
        );

        console.log(
          `[EFFECT TELEMETRY] Telemetry directory ready: ${outputPath}`,
        );
        return outputPath;
      });

    // Generate unique IDs
    const generateTraceId = (): string =>
      `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const generateSpanId = (): string =>
      `span-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Write telemetry data to files
    const writeToFile = <T>(filename: string, data: T[]): Effect.Effect<void> =>
      Effect.gen(function* (_) {
        if (!config.enabled) {
          console.log(
            `[EFFECT TELEMETRY] Telemetry disabled, skipping ${filename}`,
          );
          return;
        }

        if (data.length === 0) {
          console.log(`[EFFECT TELEMETRY] No data to write for ${filename}`);
          return;
        }

        const outputPath = yield* _(ensureOutputDirectory());
        const filePath = path.join(outputPath, filename);

        // Convert to JSON Lines format (one JSON object per line)
        const jsonContent =
          data.map((item) => JSON.stringify(item)).join('\n') + '\n';

        console.log(
          `[EFFECT TELEMETRY] Writing ${data.length} entries to ${filePath}`,
        );

        yield* _(
          Effect.tryPromise(async () => {
            await fs.appendFile(filePath, jsonContent);
          }),
          Effect.orElse(() => Effect.succeed(void 0)), // Ignore errors
        );

        console.log(
          `[EFFECT TELEMETRY] Successfully wrote ${data.length} ${filename.replace('.jsonl', '')} entries to ${filePath}`,
        );
      });

    // Write methods
    const writeTrace = (trace: TelemetryTrace): Effect.Effect<void> =>
      Effect.gen(function* (_) {
        storage.traces.push(trace);
        if (storage.traces.length >= config.maxBatchSize) {
          yield* _(flush());
        }
      });

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
        const tracesToFlush = [...storage.traces];
        const metricsToFlush = [...storage.metrics];
        const logsToFlush = [...storage.logs];

        // Clear storage
        storage.traces.length = 0;
        storage.metrics.length = 0;
        storage.logs.length = 0;

        // Write to files in parallel
        yield* _(
          Effect.all(
            [
              writeToFile('traces.jsonl', tracesToFlush),
              writeToFile('metrics.jsonl', metricsToFlush),
              writeToFile('logs.jsonl', logsToFlush),
            ],
            { concurrency: 'inherit' },
          ),
        );
      });

    // Get current trace context from FiberRef
    const getCurrentTraceContext = (): Effect.Effect<
      Option.Option<TraceContext>
    > => FiberRef.get(CurrentTraceContext);

    // Execute operation with specific trace context
    const withTraceContext = <A, E, R>(
      context: TraceContext,
      operation: Effect.Effect<A, E, R>,
    ): Effect.Effect<A, E, R> =>
      Effect.locally(CurrentTraceContext, Option.some(context))(operation);

    // Write log with automatic trace context
    const writeLogWithContext = (
      message: string,
      level: 'debug' | 'info' | 'warn' | 'error',
      attributes?: Record<string, unknown>,
    ): Effect.Effect<void> =>
      Effect.gen(function* (_) {
        // Get current trace context from FiberRef
        const currentContext = yield* _(getCurrentTraceContext());

        const { traceId, spanId } = pipe(
          currentContext,
          Option.match({
            onNone: () => ({
              traceId: 'no-active-trace',
              spanId: 'no-active-span',
            }),
            onSome: (context) => ({
              traceId: context.traceId,
              spanId: context.spanId,
            }),
          }),
        );

        const log = createTelemetryLog({
          timestamp: new Date().toISOString(),
          level,
          message,
          traceId,
          spanId,
          attributes,
        });
        yield* _(writeLog(log));
      });

    return {
      writeTrace,
      writeMetric,
      writeLog,
      flush,
      generateTraceId,
      generateSpanId,
      getCurrentTraceContext,
      withTraceContext,
      writeLogWithContext,
    };
  }),
);

/**
 * No-Op Telemetry Service Layer for production builds
 */
export const TelemetryServiceNoOp = Layer.succeed(TelemetryService, {
  writeTrace: () => Effect.void,
  writeMetric: () => Effect.void,
  writeLog: () => Effect.void,
  flush: () => Effect.void,
  generateTraceId: () => 'noop-trace-id',
  generateSpanId: () => 'noop-span-id',
  getCurrentTraceContext: () => Effect.succeed(Option.none()),
  withTraceContext: <A, E, R>(
    _context: TraceContext,
    operation: Effect.Effect<A, E, R>,
  ) => operation,
  writeLogWithContext: () => Effect.void,
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
export const writeTrace = (trace: TelemetryTrace) =>
  pipe(
    TelemetryService,
    Effect.flatMap((service) => service.writeTrace(trace)),
  );

export const writeMetric = (metric: TelemetryMetric) =>
  pipe(
    TelemetryService,
    Effect.flatMap((service) => service.writeMetric(metric)),
  );

export const writeLog = (log: TelemetryLog) =>
  pipe(
    TelemetryService,
    Effect.flatMap((service) => service.writeLog(log)),
  );

export const flush = () =>
  pipe(
    TelemetryService,
    Effect.flatMap((service) => service.flush()),
  );

export const writeLogWithContext = (
  message: string,
  level: 'debug' | 'info' | 'warn' | 'error',
  attributes?: Record<string, unknown>,
) =>
  pipe(
    TelemetryService,
    Effect.flatMap((service) =>
      service.writeLogWithContext(message, level, attributes),
    ),
  );

/**
 * Enhanced withSpan that integrates with our telemetry system
 */
export const withSpan = <A, E, R>(
  name: string,
  operation: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, TelemetryService | R> =>
  pipe(
    TelemetryService,
    Effect.flatMap((service) =>
      Effect.gen(function* (_) {
        // Get parent span context if available
        const parentContext = yield* _(service.getCurrentTraceContext());

        // Use parent's traceId if available, otherwise generate new one
        const traceId = pipe(
          parentContext,
          Option.map((ctx) => ctx.traceId),
          Option.getOrElse(() => service.generateTraceId()),
        );

        const spanId = service.generateSpanId();
        const parentSpanId = pipe(
          parentContext,
          Option.map((ctx) => ctx.spanId),
          Option.getOrUndefined,
        );

        const context: TraceContext = {
          traceId,
          spanId,
          parentSpanId,
        };

        const startTime = new Date().toISOString();
        const start = performance.now();

        // Log span start with trace context
        yield* _(
          service.withTraceContext(
            context,
            service.writeLogWithContext(`Starting span: ${name}`, 'info', {
              'span.operation': name,
              'span.phase': 'start',
              'trace.id': traceId,
              'span.id': spanId,
              'span.parent_id': parentSpanId,
            }),
          ),
        );

        try {
          // Execute operation with new trace context
          const result = yield* _(service.withTraceContext(context, operation));

          const duration = Math.round((performance.now() - start) * 100) / 100;
          const endTime = new Date().toISOString();

          // Create and write trace
          const trace = createTelemetryTrace({
            traceId,
            spanId,
            parentSpanId,
            name,
            startTime,
            endTime,
            duration,
            status: 'OK',
            attributes: {
              'operation.name': name,
              'operation.success': true,
            },
          });

          yield* _(service.writeTrace(trace));

          // Create and write success metric
          const metric = createTelemetryMetric({
            name: `${name}.duration`,
            type: 'histogram',
            value: duration,
            timestamp: endTime,
            attributes: { operation: name },
            unit: 'ms',
          });

          yield* _(service.writeMetric(metric));

          // Log span completion with trace context
          yield* _(
            service.withTraceContext(
              context,
              service.writeLogWithContext(`Completed span: ${name}`, 'info', {
                'span.operation': name,
                'span.phase': 'complete',
                'span.duration_ms': duration,
                'span.status': 'success',
                'trace.id': traceId,
                'span.id': spanId,
                'span.parent_id': parentSpanId,
              }),
            ),
          );

          return result;
        } catch (error) {
          const duration = Math.round((performance.now() - start) * 100) / 100;
          const endTime = new Date().toISOString();

          // Create and write error trace
          const trace = createTelemetryTrace({
            traceId,
            spanId,
            parentSpanId,
            name,
            startTime,
            endTime,
            duration,
            status: 'ERROR',
            attributes: {
              'operation.name': name,
              'operation.success': false,
              'error.type':
                error instanceof Error ? error.constructor.name : 'Unknown',
              'error.message':
                error instanceof Error ? error.message : String(error),
            },
          });

          yield* _(service.writeTrace(trace));

          // Log span failure with trace context and error details
          yield* _(
            service.withTraceContext(
              context,
              service.writeLogWithContext(`Failed span: ${name}`, 'error', {
                'span.operation': name,
                'span.phase': 'error',
                'span.duration_ms': duration,
                'span.status': 'failed',
                'trace.id': traceId,
                'span.id': spanId,
                'span.parent_id': parentSpanId,
                'error.type':
                  error instanceof Error ? error.constructor.name : 'Unknown',
                'error.message':
                  error instanceof Error ? error.message : String(error),
              }),
            ),
          );

          throw error;
        }
      }),
    ),
  );
