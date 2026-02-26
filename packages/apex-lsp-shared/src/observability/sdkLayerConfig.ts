/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Telemetry settings that can be configured via VS Code settings
 */
export interface TelemetrySettings {
  /** Enable telemetry collection (respects VS Code global setting) */
  readonly enabled: boolean;

  /** App Insights connection string (overrides default) */
  readonly appInsightsConnectionString?: string;

  /** Enable local OTEL collector export */
  readonly localTracingEnabled: boolean;

  /** Enable console span logging (development only) */
  readonly consoleTracingEnabled: boolean;
}

/**
 * Default telemetry settings
 */
export const DEFAULT_TELEMETRY_SETTINGS: TelemetrySettings = {
  enabled: false,
  localTracingEnabled: false,
  consoleTracingEnabled: false,
};
