/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { SdkLayerConfig } from './sdkLayerConfig';
import { NodeSdkLayerFor } from './spansNode';
import { WebSdkLayerFor, type WebSdkLayerOptions } from './spansWeb';
import { isNodeEnvironment } from '../utils/Environment';

// Re-export types for convenience
export type { SdkLayerConfig } from './sdkLayerConfig';
export type { WebSdkLayerOptions } from './spansWeb';

/**
 * Options for creating an SDK layer
 */
export interface SdkLayerFactoryOptions extends WebSdkLayerOptions {
  /** Force a specific environment instead of auto-detecting */
  forceEnvironment?: 'node' | 'web';
}

/**
 * Factory for SDK layers based on environment.
 * Automatically selects Node or Web SDK based on runtime detection.
 *
 * @param config - SDK layer configuration
 * @param options - Additional options including reporter factory for web
 * @returns Effect layer that provides tracing appropriate for the environment
 */
export const SdkLayerFor = (
  config: SdkLayerConfig,
  options: SdkLayerFactoryOptions = {},
) => {
  const isNode =
    options.forceEnvironment === 'node' ||
    (options.forceEnvironment !== 'web' && isNodeEnvironment());

  return isNode ? NodeSdkLayerFor(config) : WebSdkLayerFor(config, options);
};

/**
 * Get environment variables for telemetry configuration.
 * Works in both Node.js and browser environments.
 */
const getEnvVar = (name: string): string | undefined => {
  if (isNodeEnvironment() && typeof process !== 'undefined') {
    return process.env[name];
  }
  return undefined;
};

/**
 * Pre-built SDK layer for the Apex Language Server.
 *
 * Configuration is read from environment variables:
 * - APEX_LSP_APP_INSIGHTS_CONNECTION_STRING: App Insights connection string
 * - APEX_LSP_LOCAL_TRACING: Enable local OTEL collector export ('true'/'false')
 * - APEX_LSP_CONSOLE_TRACING: Enable console span logging ('true'/'false')
 *
 * @param version - The extension version
 * @param options - Additional options including reporter factory for web
 * @returns Effect layer configured for the Apex Language Server
 */
export const ApexLspSdkLayer = (
  version: string,
  options: SdkLayerFactoryOptions = {},
) =>
  SdkLayerFor(
    {
      extensionName: 'apex-language-server',
      extensionVersion: version,
      appInsightsConnectionString: getEnvVar(
        'APEX_LSP_APP_INSIGHTS_CONNECTION_STRING',
      ),
      localTracingEnabled: getEnvVar('APEX_LSP_LOCAL_TRACING') === 'true',
      consoleTracingEnabled: getEnvVar('APEX_LSP_CONSOLE_TRACING') === 'true',
    },
    options,
  );

/**
 * Creates an SDK layer with explicit configuration.
 * Use this when you need full control over the configuration.
 *
 * @param config - Full SDK layer configuration
 * @param options - Additional options including reporter factory for web
 * @returns Effect layer configured with the provided settings
 */
export const createSdkLayer = (
  config: SdkLayerConfig,
  options: SdkLayerFactoryOptions = {},
) => SdkLayerFor(config, options);
