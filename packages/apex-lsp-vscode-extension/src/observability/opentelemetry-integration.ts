/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  ConsoleSpanExporter,
  SpanExporter,
} from '@opentelemetry/sdk-trace-base';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { trace, context } from '@opentelemetry/api';
import type { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import type { ExportResult } from '@opentelemetry/core';
import * as fs from 'fs';
import * as path from 'path';

/**
 * OpenTelemetry Integration for Effect.ts
 *
 * This module provides OpenTelemetry integration with Effect.ts, following the
 * printing spans example from the Effect.ts documentation. It enables proper
 * distributed tracing with real span IDs, trace IDs, and span relationships.
 */

/**
 * Custom Dual Span Exporter that writes to both console and file
 * This ensures OpenTelemetry span data is replicated in both outputs
 */
class DualSpanExporter implements SpanExporter {
  private consoleExporter = new ConsoleSpanExporter();

  export(
    spans: ReadableSpan[],
    resultCallback: (result: ExportResult) => void,
  ): void {
    // First, export to console using the built-in exporter
    this.consoleExporter.export(spans, () => {
      // Then write the same span data to our log file
      this.writeSpansToFile(spans);

      // Call the result callback to indicate success
      resultCallback({ code: 0 }); // ExportResultCode.SUCCESS = 0
    });
  }

  private writeSpansToFile(spans: ReadableSpan[]): void {
    const logDir = path.join(process.cwd(), '.telemetry');
    const logFile = path.join(logDir, 'spans.telemetry');

    // Ensure log directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Convert spans to JSON and write to file
    spans.forEach((span) => {
      const spanData = {
        timestamp: new Date().toISOString(),
        type: 'span',
        resource: span.resource,
        instrumentationScope: span.instrumentationLibrary, // Use instrumentationLibrary instead
        traceId: span.spanContext().traceId,
        spanId: span.spanContext().spanId,
        parentSpanId: span.parentSpanId,
        name: span.name,
        kind: span.kind,
        startTime: span.startTime,
        endTime: span.endTime,
        duration: span.duration,
        attributes: span.attributes,
        status: span.status,
        events: span.events,
        links: span.links,
      };

      // Write as pretty-printed JSON with separators for readability
      const prettyJsonEntry =
        JSON.stringify(spanData, null, 2) + '\n' + '---\n';
      fs.appendFileSync(logFile, prettyJsonEntry);
    });
  }

  shutdown(): Promise<void> {
    return this.consoleExporter.shutdown();
  }
}

// OpenTelemetry SDK setup with custom dual exporter (spans logged to both console and file)
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'apex-language-server-extension',
    [SemanticResourceAttributes.SERVICE_VERSION]: '0.1.9',
  }),
  traceExporter: new DualSpanExporter(),
});

// Initialize OpenTelemetry
sdk.start();

/**
 * File logging utility for OpenTelemetry logs
 * Supports both simple string messages and structured JSON logs
 */
const logToFile = (
  message: string,
  level?: string,
  spanInfo?: { spanId: string; traceId: string },
  attributes?: Record<string, unknown>,
) => {
  const logDir = path.join(process.cwd(), '.telemetry');
  const logFile = path.join(logDir, 'logs.telemetry');

  // Ensure log directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Create structured log entry with all fields
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: level || 'info',
    message,
    ...(spanInfo && {
      span: {
        spanId: spanInfo.spanId,
        traceId: spanInfo.traceId,
      },
    }),
    ...(attributes && { attributes }),
  };

  // Write as JSON Lines format (one JSON object per line)
  const jsonLogEntry = JSON.stringify(logEntry) + '\n';

  // Append to log file
  fs.appendFileSync(logFile, jsonLogEntry);
};

/**
 * Simple OpenTelemetry span wrapper that avoids complex type constraints
 * This version handles async operations properly
 */
export const withOpenTelemetrySpan = (
  name: string,
  attributes?: Record<string, string | number | boolean>,
) => {
  return <R, E, A>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> => {
    return Effect.gen(function* (_) {
      const tracer = trace.getTracer('apex-language-server-extension');
      const span = tracer.startSpan(name, { attributes });

      // Set the span as active
      const activeContext = context.active();
      const spanContext = trace.setSpan(activeContext, span);

      // Execute the effect with the span context
      const result = yield* _(
        Effect.sync(() => {
          // Set the OpenTelemetry context but return the original effect
          // The span context will be available to any OpenTelemetry calls within
          return context.with(spanContext, () => effect);
        }),
      );

      // Execute the effect that now has the span context set
      const finalResult = yield* _(result);

      // End the span
      span.end();

      return finalResult;
    });
  };
};

/**
 * Enhanced logging function that includes OpenTelemetry span context
 * Logs are written to both console and file with identical structured format
 */
export const logWithOpenTelemetryContext = (
  message: string,
  level: 'debug' | 'info' | 'warn' | 'error' = 'info',
  attributes?: Record<string, unknown>,
) => {
  return Effect.sync(() => {
    const currentSpan = trace.getActiveSpan();

    if (currentSpan) {
      // Add log event to the current span
      currentSpan.addEvent(message, {
        'log.level': level,
        'log.message': message,
        ...attributes,
      });

      // Extract span context information
      const spanContext = currentSpan.spanContext();
      const spanInfo = {
        spanId: spanContext.spanId,
        traceId: spanContext.traceId,
      };

      // Create structured console message that matches file format
      const consoleMessage = `[${level.toUpperCase()}] [span:${spanInfo.spanId}, trace:${spanInfo.traceId}] ${message}`;

      // Add attributes to console if present
      const consoleOutput =
        attributes && Object.keys(attributes).length > 0
          ? `${consoleMessage} ${JSON.stringify(attributes)}`
          : consoleMessage;

      // Log to console for immediate feedback
      console.log(consoleOutput);

      // Write structured data to file with all the same fields
      logToFile(message, level, spanInfo, attributes);
    } else {
      // No active span, log without span context
      const consoleMessage = `[${level.toUpperCase()}] [no-span] ${message}`;

      // Add attributes to console if present
      const consoleOutput =
        attributes && Object.keys(attributes).length > 0
          ? `${consoleMessage} ${JSON.stringify(attributes)}`
          : consoleMessage;

      // Log to console for immediate feedback
      console.log(consoleOutput);

      // Write structured data to file (without span info)
      logToFile(message, level, undefined, attributes);
    }
  });
};

/**
 * Cleanup function to stop OpenTelemetry SDK
 */
export const shutdownOpenTelemetry = () => {
  return Effect.sync(() => {
    sdk.shutdown();
  });
};
