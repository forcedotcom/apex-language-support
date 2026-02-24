/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Local tracing configuration for development.
 *
 * This module provides configuration for exporting traces to a local
 * OpenTelemetry Collector, which is useful for development and debugging.
 */

/**
 * Default OTEL Collector endpoints for local development
 */
export const OTEL_COLLECTOR_ENDPOINTS = {
  /** HTTP endpoint for OTLP trace export */
  http: 'http://localhost:4318/v1/traces',

  /** gRPC endpoint for OTLP trace export */
  grpc: 'http://localhost:4317',

  /** Health check endpoint */
  healthCheck: 'http://localhost:13133',
} as const;

/**
 * Check if local tracing should be enabled based on environment
 */
export const isLocalTracingEnabled = (): boolean => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.APEX_LSP_LOCAL_TRACING === 'true';
  }
  return false;
};

/**
 * Check if console tracing should be enabled based on environment
 */
export const isConsoleTracingEnabled = (): boolean => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.APEX_LSP_CONSOLE_TRACING === 'true';
  }
  return false;
};

/**
 * Get the App Insights connection string from environment
 */
export const getAppInsightsConnectionString = (): string | undefined => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.APEX_LSP_APP_INSIGHTS_CONNECTION_STRING;
  }
  return undefined;
};

/**
 * Local development configuration for tracing.
 * Use this when setting up local development with Docker Compose.
 */
export const LOCAL_DEV_CONFIG = {
  /** Environment variables to set for local tracing */
  envVars: {
    APEX_LSP_LOCAL_TRACING: 'true',
    APEX_LSP_CONSOLE_TRACING: 'false',
  },

  /** VS Code settings for local development */
  vscodeSettings: {
    'apex.telemetry.localTracingEnabled': true,
    'apex.telemetry.consoleTracingEnabled': false,
  },

  /** Docker Compose command to start OTEL Collector */
  dockerCommands: {
    start: 'docker-compose -f telemetry/docker-compose.yaml up -d',
    stop: 'docker-compose -f telemetry/docker-compose.yaml down',
    logs: 'docker-compose -f telemetry/docker-compose.yaml logs -f otel-collector',
  },
} as const;
