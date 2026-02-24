/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as NodeSdk from '@effect/opentelemetry/NodeSdk';
import { AzureMonitorTraceExporter } from '@azure/monitor-opentelemetry-exporter';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import {
  ConsoleSpanExporter,
  type SpanExporter,
} from '@opentelemetry/sdk-trace-base';

import type { SdkLayerConfig } from './sdkLayerConfig';
import { SpanTransformProcessor } from './spanTransformProcessor';

/**
 * Creates an Effect NodeSdk layer configured for the Node.js environment (desktop VS Code).
 *
 * This layer automatically integrates with Effect's tracing system, allowing
 * spans to be created using Effect.withSpan() and Effect.annotateCurrentSpan().
 *
 * Following the salesforcedx-vscode-services pattern for Node.js telemetry.
 *
 * @param config - SDK layer configuration
 * @returns Effect layer that provides NodeSdk tracing
 */
export const NodeSdkLayerFor = (config: SdkLayerConfig) => {
  const spanProcessors: SpanTransformProcessor[] = [];

  // Console exporter for debugging
  if (config.consoleTracingEnabled) {
    spanProcessors.push(new SpanTransformProcessor(new ConsoleSpanExporter()));
  }

  // App Insights for production telemetry
  // Type cast is needed due to version mismatch between @azure/monitor-opentelemetry-exporter
  // and @opentelemetry/sdk-trace-base packages - runtime behavior is compatible
  if (config.appInsightsConnectionString) {
    spanProcessors.push(
      new SpanTransformProcessor(
        new AzureMonitorTraceExporter({
          connectionString: config.appInsightsConnectionString,
        }) as unknown as SpanExporter,
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

  return NodeSdk.layer(() => ({
    resource: {
      serviceName: config.extensionName,
      serviceVersion: config.extensionVersion,
      attributes: {
        'extension.name': config.extensionName,
        'extension.version': config.extensionVersion,
        'service.platform': 'desktop',
        ...config.additionalAttributes,
      },
    },
    spanProcessor: spanProcessors,
  }));
};
