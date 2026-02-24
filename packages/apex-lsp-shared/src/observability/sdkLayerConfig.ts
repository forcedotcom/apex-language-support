/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Configuration for OpenTelemetry SDK layers.
 * Following the salesforcedx-vscode-services observability patterns.
 */
export interface SdkLayerConfig {
  /** Name of the extension/service being instrumented */
  readonly extensionName: string;

  /** Version of the extension/service */
  readonly extensionVersion: string;

  /** Azure Application Insights connection string for production telemetry */
  readonly appInsightsConnectionString?: string;

  /** Enable export to local OTEL collector (http://localhost:4318) */
  readonly localTracingEnabled?: boolean;

  /** Enable console span logging for debugging */
  readonly consoleTracingEnabled?: boolean;

  /** Custom attributes to add to all spans */
  readonly additionalAttributes?: Record<string, string | number | boolean>;
}

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
  enabled: true,
  localTracingEnabled: false,
  consoleTracingEnabled: false,
};
