/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Schema, Data } from 'effect';

/**
 * Simplified telemetry schemas using Effect's built-in Schema system
 *
 * This module leverages Effect's built-in schemas for type-safe validation
 * while keeping telemetry data structures simple and aligned with Effect patterns.
 */

/**
 * Log Level Schema
 */
export const LogLevelSchema = Schema.Literal('debug', 'info', 'warn', 'error');
export type LogLevel = Schema.Schema.Type<typeof LogLevelSchema>;

/**
 * Metric Type Schema
 */
export const MetricTypeSchema = Schema.Literal('counter', 'histogram', 'gauge');
export type MetricType = Schema.Schema.Type<typeof MetricTypeSchema>;

/**
 * Restart Server Error Reason Schema
 */
export const RestartServerErrorReasonSchema = Schema.Literal(
  'StopClientFailed',
  'StartClientFailed',
  'ConfigurationError',
  'TimeoutError',
);
export type RestartServerErrorReason = Schema.Schema.Type<
  typeof RestartServerErrorReasonSchema
>;

/**
 * Basic Telemetry Event Schema
 */
export const TelemetryEventSchema = Schema.Struct({
  timestamp: Schema.String,
  name: Schema.String,
  attributes: Schema.optional(
    Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  ),
});
export type TelemetryEvent = Schema.Schema.Type<typeof TelemetryEventSchema>;

/**
 * Telemetry Metric Schema
 */
export const TelemetryMetricSchema = Schema.Struct({
  name: Schema.String,
  type: MetricTypeSchema,
  value: Schema.Number,
  timestamp: Schema.String,
  attributes: Schema.optional(
    Schema.Record({ key: Schema.String, value: Schema.String }),
  ),
  unit: Schema.optional(Schema.String),
});
export type TelemetryMetric = Schema.Schema.Type<typeof TelemetryMetricSchema>;

/**
 * Telemetry Log Schema
 */
export const TelemetryLogSchema = Schema.Struct({
  timestamp: Schema.String,
  level: LogLevelSchema,
  message: Schema.String,
  attributes: Schema.optional(
    Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  ),
});
export type TelemetryLog = Schema.Schema.Type<typeof TelemetryLogSchema>;

/**
 * Restart Server Error using Effect's Data.TaggedError
 */
export class RestartServerError extends Data.TaggedError('RestartServerError')<{
  readonly reason: RestartServerErrorReason;
  readonly message: string;
  readonly underlyingError?: unknown;
  readonly timestamp: string;
  readonly context?: Record<string, unknown>;
}> {}

/**
 * Type-safe constructors using Effect Schema validation
 */
export const createTelemetryEvent =
  Schema.decodeUnknownSync(TelemetryEventSchema);
export const createTelemetryMetric = Schema.decodeUnknownSync(
  TelemetryMetricSchema,
);
export const createTelemetryLog = Schema.decodeUnknownSync(TelemetryLogSchema);

/**
 * Create a typed restart server error
 */
export const createRestartServerError = (
  reason: RestartServerErrorReason,
  message: string,
  underlyingError?: unknown,
  context?: Record<string, unknown>,
): RestartServerError => {
  return new RestartServerError({
    reason,
    message: `Restart server failed: ${reason} - ${message}`,
    underlyingError,
    timestamp: new Date().toISOString(),
    context,
  });
};

/**
 * Validation functions that return Effect operations
 */
export const validateTelemetryEvent =
  Schema.decodeUnknown(TelemetryEventSchema);
export const validateTelemetryMetric = Schema.decodeUnknown(
  TelemetryMetricSchema,
);
export const validateTelemetryLog = Schema.decodeUnknown(TelemetryLogSchema);

/**
 * Convenience type exports for backward compatibility
 */
export type TelemetryTrace = TelemetryEvent; // Simplified - use Effect's built-in tracing instead
export const createTelemetryTrace = createTelemetryEvent; // Backward compatibility
