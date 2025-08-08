/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Effect.ts Observability Module
 *
 * This module provides comprehensive observability features including:
 * - Distributed tracing with span correlation
 * - Metrics collection (counters, histograms, gauges)
 * - Structured logging with trace correlation
 * - Typed error handling
 * - File-based telemetry export (JSON Lines format)
 */

// Core schemas and types
export type {
  TelemetryEvent,
  TelemetryMetric,
  TelemetryLog,
  RestartServerError,
  LogLevel,
  MetricType,
  RestartServerErrorReason,
} from './schemas';

export {
  createTelemetryEvent,
  createTelemetryMetric,
  createTelemetryLog,
  createRestartServerError,
  // Backward compatibility
  createTelemetryTrace,
} from './schemas';

// Effect.ts telemetry service and layer
export type { TelemetryService, TelemetryConfig } from './telemetry-layer';

export {
  TelemetryService as TelemetryServiceTag,
  TelemetryLive,
  TelemetryServiceNoOp,
  writeMetric,
  writeLog,
  flush,
  logWithTracing,
  recordOperationMetric,
} from './telemetry-layer';

// Effect.ts instrumented operations
export {
  effectRestartLanguageServer,
  runEffectRestartLanguageServer,
  simulatedErrorRestart,
  runSimulatedErrorRestart,
} from './instrumented-restart';
