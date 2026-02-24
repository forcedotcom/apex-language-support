/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Azure Application Insights connection configuration.
 *
 * This module provides utilities for working with Application Insights
 * connection strings and configuration.
 */

/**
 * Parsed Application Insights connection string components
 */
export interface AppInsightsConnectionConfig {
  readonly instrumentationKey: string;
  readonly ingestionEndpoint?: string;
  readonly liveEndpoint?: string;
}

/**
 * Parse an Application Insights connection string into its components.
 *
 * Connection string format:
 * InstrumentationKey=xxx;IngestionEndpoint=https://xxx.in.applicationinsights.azure.com/;
 * LiveEndpoint=https://xxx.livediagnostics.monitor.azure.com/
 *
 * @param connectionString - The full connection string
 * @returns Parsed connection config or null if invalid
 */
export const parseConnectionString = (
  connectionString: string,
): AppInsightsConnectionConfig | null => {
  if (!connectionString) {
    return null;
  }

  const parts = connectionString.split(';');
  const config: Record<string, string> = {};

  for (const part of parts) {
    const [key, ...valueParts] = part.split('=');
    if (key && valueParts.length > 0) {
      config[key.trim()] = valueParts.join('=').trim();
    }
  }

  const instrumentationKey = config['InstrumentationKey'];
  if (!instrumentationKey) {
    return null;
  }

  return {
    instrumentationKey,
    ingestionEndpoint: config['IngestionEndpoint'],
    liveEndpoint: config['LiveEndpoint'],
  };
};

/**
 * Validate an Application Insights connection string.
 *
 * @param connectionString - The connection string to validate
 * @returns true if the connection string is valid
 */
export const isValidConnectionString = (connectionString: string): boolean =>
  parseConnectionString(connectionString) !== null;

/**
 * Get the instrumentation key from a connection string.
 *
 * @param connectionString - The full connection string
 * @returns The instrumentation key or undefined if invalid
 */
export const getInstrumentationKey = (
  connectionString: string,
): string | undefined =>
  parseConnectionString(connectionString)?.instrumentationKey;
