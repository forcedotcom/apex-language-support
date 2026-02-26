/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Observability module for the Apex Language Server.
 *
 * This module provides:
 * - Effect-TS integrated tracing (gracefully no-ops without SDK init)
 * - In-memory telemetry aggregation sent via LSP telemetry/event
 * - Startup snapshot collection
 * - Command performance tracking
 */

export type { TelemetrySettings } from './sdkLayerConfig';
export { DEFAULT_TELEMETRY_SETTINGS } from './sdkLayerConfig';

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

export type {
  TelemetryEventType,
  StartupSnapshotEvent,
  CommandSummary,
  CommandPerformanceEvent,
  TelemetryEvent,
} from './telemetryEvents';

export { CommandPerformanceAggregator } from './commandPerformanceAggregator';

export {
  collectStartupSnapshot,
  generateSessionId,
  hashWorkspaceUri,
} from './startupSnapshot';
export type { StartupSnapshotParams } from './startupSnapshot';
