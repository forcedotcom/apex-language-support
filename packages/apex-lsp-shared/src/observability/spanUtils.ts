/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Attributes } from '@opentelemetry/api';
import type { ReadableSpan } from '@opentelemetry/sdk-trace-base';

/**
 * Check if a span is a top-level span (no parent)
 */
export const isTopLevelSpan = (span: ReadableSpan): boolean =>
  !span.parentSpanId;

/**
 * Convert OpenTelemetry attributes to a Record of strings
 * for compatibility with various exporters
 */
export const convertAttributes = (
  attributes: Attributes,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(attributes)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)]),
  );

/**
 * Calculate span duration in milliseconds from the OTEL duration format
 * Duration is stored as [seconds, nanoseconds]
 */
export const spanDuration = (span: ReadableSpan): number => {
  if (!span.duration) {
    return 0;
  }
  // duration is [seconds, nanoseconds]
  return span.duration[0] * 1000 + span.duration[1] / 1_000_000;
};

/**
 * Get the span start time as a Date object
 */
export const spanStartTime = (span: ReadableSpan): Date => {
  if (!span.startTime) {
    return new Date();
  }
  // startTime is [seconds, nanoseconds]
  const milliseconds = span.startTime[0] * 1000 + span.startTime[1] / 1_000_000;
  return new Date(milliseconds);
};

/**
 * Get the span end time as a Date object
 */
export const spanEndTime = (span: ReadableSpan): Date => {
  if (!span.endTime) {
    return new Date();
  }
  // endTime is [seconds, nanoseconds]
  const milliseconds = span.endTime[0] * 1000 + span.endTime[1] / 1_000_000;
  return new Date(milliseconds);
};

/**
 * Format span for logging
 */
export const formatSpanForLogging = (span: ReadableSpan): string => {
  const duration = spanDuration(span);
  const traceId = span.spanContext().traceId;
  const spanId = span.spanContext().spanId;
  const status = span.status?.code === 2 ? 'ERROR' : 'OK';

  return `[${span.name}] traceId=${traceId} spanId=${spanId} duration=${duration.toFixed(2)}ms status=${status}`;
};
