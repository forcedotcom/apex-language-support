/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as WebSdk from '@effect/opentelemetry/WebSdk';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-web';

import type { SdkLayerConfig } from './sdkLayerConfig';
import { SpanTransformProcessor } from './spanTransformProcessor';
import {
  ApplicationInsightsWebExporter,
  type TelemetryReporterFactory,
} from './applicationInsightsWebExporter';

/**
 * Options for creating a Web SDK layer
 */
export interface WebSdkLayerOptions {
  /** Factory for creating the telemetry reporter (required for App Insights in web) */
  reporterFactory?: TelemetryReporterFactory;
}

/**
 * Creates an Effect WebSdk layer configured for the browser/web worker environment (VS Code Web).
 *
 * This layer automatically integrates with Effect's tracing system, allowing
 * spans to be created using Effect.withSpan() and Effect.annotateCurrentSpan().
 *
 * Note: The @azure/monitor-opentelemetry-exporter doesn't work in browser environments,
 * so this layer uses the ApplicationInsightsWebExporter which wraps @vscode/extension-telemetry.
 *
 * Following the salesforcedx-vscode-services pattern for Web telemetry.
 *
 * @param config - SDK layer configuration
 * @param options - Additional options including reporter factory
 * @returns Effect layer that provides WebSdk tracing
 */
export const WebSdkLayerFor = (
  config: SdkLayerConfig,
  options: WebSdkLayerOptions = {},
) => {
  const spanProcessors: SpanTransformProcessor[] = [];

  // Console exporter for debugging
  if (config.consoleTracingEnabled) {
    spanProcessors.push(new SpanTransformProcessor(new ConsoleSpanExporter()));
  }

  // App Insights for production telemetry (via web-specific exporter)
  if (config.appInsightsConnectionString && options.reporterFactory) {
    spanProcessors.push(
      new SpanTransformProcessor(
        new ApplicationInsightsWebExporter(config, options.reporterFactory),
      ),
    );
  }

  // Local OTEL Collector for development
  if (config.localTracingEnabled) {
    spanProcessors.push(
      new SpanTransformProcessor(
        new OTLPTraceExporter({
          url: 'http://localhost:4318/v1/traces',
        }),
      ),
    );
  }

  return WebSdk.layer(() => ({
    resource: {
      serviceName: config.extensionName,
      serviceVersion: config.extensionVersion,
      attributes: {
        'extension.name': config.extensionName,
        'extension.version': config.extensionVersion,
        'service.platform': 'web',
        'service.environment': 'vscode-extension',
        ...config.additionalAttributes,
      },
    },
    spanProcessor: spanProcessors,
  }));
};
