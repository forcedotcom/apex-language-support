/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SpanStatusCode } from '@opentelemetry/api';
import { ExportResultCode } from '@opentelemetry/core';
import type { ExportResult } from '@opentelemetry/core';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';

import type { SdkLayerConfig } from './sdkLayerConfig';
import { convertAttributes, isTopLevelSpan, spanDuration } from './spanUtils';

/**
 * Telemetry reporter interface for web environments.
 * This interface abstracts the @vscode/extension-telemetry reporter
 * to allow for easier testing and platform-specific implementations.
 */
export interface TelemetryReporterLike {
  sendDangerousTelemetryEvent(
    eventName: string,
    properties?: Record<string, string>,
    measurements?: Record<string, number>,
  ): void;
  sendDangerousTelemetryErrorEvent(
    eventName: string,
    properties?: Record<string, string>,
    measurements?: Record<string, number>,
  ): void;
  dispose(): Promise<void>;
}

/**
 * Factory function type for creating telemetry reporters
 */
export type TelemetryReporterFactory = (
  connectionString: string,
) => TelemetryReporterLike;

/**
 * Web-specific Application Insights exporter.
 *
 * This exporter is designed for browser/web worker environments where
 * the @azure/monitor-opentelemetry-exporter doesn't work. It uses the
 * @vscode/extension-telemetry reporter pattern instead.
 *
 * Following the salesforcedx-vscode-services pattern for web telemetry.
 */
export class ApplicationInsightsWebExporter implements SpanExporter {
  private reporter: TelemetryReporterLike | null = null;
  private readonly connectionString: string;
  private readonly reporterFactory?: TelemetryReporterFactory;
  private isShutdown = false;

  constructor(
    config: SdkLayerConfig,
    reporterFactory?: TelemetryReporterFactory,
  ) {
    if (!config.appInsightsConnectionString) {
      throw new Error(
        'ApplicationInsightsWebExporter requires appInsightsConnectionString',
      );
    }
    this.connectionString = config.appInsightsConnectionString;
    this.reporterFactory = reporterFactory;
  }

  /**
   * Lazily initialize the reporter when needed.
   * This allows the exporter to be created before the VS Code extension
   * context is fully available.
   */
  private getReporter(): TelemetryReporterLike | null {
    if (this.isShutdown) {
      return null;
    }

    if (!this.reporter && this.reporterFactory) {
      try {
        this.reporter = this.reporterFactory(this.connectionString);
      } catch (error) {
        console.warn(
          'Failed to initialize telemetry reporter:',
          error instanceof Error ? error.message : String(error),
        );
        return null;
      }
    }

    return this.reporter;
  }

  /**
   * Export spans to Application Insights via the VS Code telemetry reporter.
   * Only exports top-level spans to reduce noise.
   */
  export(
    spans: ReadableSpan[],
    resultCallback: (result: ExportResult) => void,
  ): void {
    if (this.isShutdown) {
      resultCallback({ code: ExportResultCode.FAILED });
      return;
    }

    const reporter = this.getReporter();
    if (!reporter) {
      // No reporter available, but don't fail - just skip
      resultCallback({ code: ExportResultCode.SUCCESS });
      return;
    }

    // Export only top-level spans to avoid noise
    spans.filter(isTopLevelSpan).forEach((span) => {
      const success = !span.status || span.status.code !== SpanStatusCode.ERROR;
      const props: Record<string, string> = {
        ...convertAttributes(span.attributes),
        traceID: span.spanContext().traceId,
        spanID: span.spanContext().spanId,
        'service.platform': 'web',
      };

      // Add parent span ID if available
      if (span.parentSpanId) {
        props.parentSpanID = span.parentSpanId;
      }

      const measurements: Record<string, number> = {
        duration: spanDuration(span),
      };

      if (success) {
        reporter.sendDangerousTelemetryEvent(span.name, props, measurements);
      } else {
        reporter.sendDangerousTelemetryErrorEvent(
          span.name,
          props,
          measurements,
        );
      }
    });

    resultCallback({ code: ExportResultCode.SUCCESS });
  }

  /**
   * Shutdown the exporter and dispose of the telemetry reporter
   */
  async shutdown(): Promise<void> {
    if (this.isShutdown) {
      return;
    }

    this.isShutdown = true;

    if (this.reporter) {
      await this.reporter.dispose();
      this.reporter = null;
    }
  }
}
