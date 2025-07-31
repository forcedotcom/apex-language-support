/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Effect.ts telemetry types with simplified implementation for compatibility
 *
 * Note: This maintains the Effect.ts patterns while ensuring compatibility
 * with the current codebase during transition.
 */

/**
 * Telemetry data types (compatible with Effect.ts schemas)
 */
export interface TelemetryEvent {
  timestamp: string;
  name: string;
  attributes?: Record<string, unknown>;
}

export interface TelemetryTrace {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: string; // ISO timestamp
  endTime: string; // ISO timestamp
  duration: number;
  status: 'OK' | 'ERROR';
  attributes: Record<string, unknown>;
  events?: TelemetryEvent[];
}

/**
 * Telemetry Metric Interface
 */
export interface TelemetryMetric {
  name: string;
  type: 'counter' | 'histogram' | 'gauge';
  value: number;
  timestamp: string; // ISO timestamp
  attributes?: Record<string, string>;
  unit?: string;
}

/**
 * Error information interface
 */
export interface ErrorInfo {
  name: string;
  message: string;
  stack?: string;
}

/**
 * Telemetry Log Interface
 */
export interface TelemetryLog {
  timestamp: string; // ISO timestamp
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  traceId?: string;
  spanId?: string;
  attributes?: Record<string, unknown>;
  error?: ErrorInfo;
}

/**
 * Effect.ts Typed Error Interface
 */
export interface RestartServerError {
  _tag: 'RestartServerError';
  reason:
    | 'StopClientFailed'
    | 'StartClientFailed'
    | 'ConfigurationError'
    | 'TimeoutError';
  message: string;
  underlyingError?: unknown;
  timestamp: string;
  context?: Record<string, unknown>;
}

/**
 * Type-safe constructor functions (Effect.ts pattern)
 */
export const createTelemetryTrace = (data: TelemetryTrace): TelemetryTrace => {
  // Validate required fields
  if (!data.traceId || !data.spanId || !data.name) {
    throw new Error('Invalid TelemetryTrace: missing required fields');
  }
  return data;
};

export const createTelemetryMetric = (
  data: TelemetryMetric,
): TelemetryMetric => {
  // Validate required fields
  if (!data.name || typeof data.value !== 'number') {
    throw new Error('Invalid TelemetryMetric: missing required fields');
  }
  return data;
};

export const createTelemetryLog = (data: TelemetryLog): TelemetryLog => {
  // Validate required fields
  if (!data.timestamp || !data.level || !data.message) {
    throw new Error('Invalid TelemetryLog: missing required fields');
  }
  return data;
};

/**
 * Create a typed restart server error
 */
export const createRestartServerError = (
  reason: RestartServerError['reason'],
  message: string,
  underlyingError?: unknown,
  context?: Record<string, unknown>,
): RestartServerError => {
  return {
    _tag: 'RestartServerError',
    reason,
    message: `Restart server failed: ${reason} - ${message}`,
    underlyingError,
    timestamp: new Date().toISOString(),
    context,
  };
};
