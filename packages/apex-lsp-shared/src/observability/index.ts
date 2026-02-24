/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * OpenTelemetry-based observability module for the Apex Language Server.
 *
 * This module provides:
 * - Effect-TS integrated tracing via @effect/opentelemetry
 * - Azure Application Insights export for production telemetry
 * - Local OTEL Collector support for development
 * - Console tracing for debugging
 * - Web and Node.js environment support
 *
 * Following the salesforcedx-vscode-services observability patterns
 * with Effect-TS integration.
 *
 * @example
 * ```typescript
 * import * as Effect from 'effect/Effect';
 * import { ApexLspSdkLayer } from '@salesforce/apex-lsp-shared/observability';
 *
 * const program = Effect.gen(function* () {
 *   yield* Effect.log('Starting operation');
 *   return 'done';
 * }).pipe(
 *   Effect.withSpan('my.operation', {
 *     attributes: { 'my.attribute': 'value' }
 *   })
 * );
 *
 * // Run with tracing
 * await Effect.runPromise(Effect.provide(program, ApexLspSdkLayer('1.0.0')));
 * ```
 */

export type { SdkLayerConfig, TelemetrySettings } from './sdkLayerConfig';
export { DEFAULT_TELEMETRY_SETTINGS } from './sdkLayerConfig';

export {
  isTopLevelSpan,
  convertAttributes,
  spanDuration,
  spanStartTime,
  spanEndTime,
  formatSpanForLogging,
} from './spanUtils';

export {
  OTEL_COLLECTOR_ENDPOINTS,
  isLocalTracingEnabled,
  isConsoleTracingEnabled,
  getAppInsightsConnectionString,
  LOCAL_DEV_CONFIG,
} from './localTracing';

export {
  parseConnectionString,
  isValidConnectionString,
  getInstrumentationKey,
  type AppInsightsConnectionConfig,
} from './appInsights';

export {
  initializeTracing,
  isTracingEnabled,
  disableTracing,
  shutdownTracing,
  runWithSpan,
  runSyncWithSpan,
  withTracing,
  annotateCurrentSpan,
  LSP_SPAN_NAMES,
  type LspSpanAttributes,
} from './tracing';
