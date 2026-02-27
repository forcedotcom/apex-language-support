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

  /** Enable local file-based telemetry export */
  readonly localTracingEnabled: boolean;
}

/**
 * Default telemetry settings
 */
export const DEFAULT_TELEMETRY_SETTINGS: TelemetrySettings = {
  enabled: false,
  localTracingEnabled: false,
};
