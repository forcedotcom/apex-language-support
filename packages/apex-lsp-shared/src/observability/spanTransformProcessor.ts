/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Context } from '@opentelemetry/api';
import type {
  ReadableSpan,
  Span,
  SpanExporter,
  SpanProcessor,
} from '@opentelemetry/sdk-trace-base';

/**
 * Options for the SpanTransformProcessor
 */
export interface SpanTransformProcessorOptions {
  /** Timeout for export operations in milliseconds */
  readonly exportTimeoutMillis?: number;

  /** Maximum number of spans to queue before forcing export */
  readonly maxQueueSize?: number;

  /** Optional filter to decide which spans to export */
  readonly spanFilter?: (span: ReadableSpan) => boolean;
}

/**
 * A custom span processor that wraps an exporter and provides
 * additional transformation and filtering capabilities.
 *
 * Following the salesforcedx-vscode-services pattern for span processing.
 */
export class SpanTransformProcessor implements SpanProcessor {
  private readonly exporter: SpanExporter;
  private readonly options: SpanTransformProcessorOptions;
  private pendingSpans: ReadableSpan[] = [];
  private isShutdown = false;

  constructor(
    exporter: SpanExporter,
    options: SpanTransformProcessorOptions = {},
  ) {
    this.exporter = exporter;
    this.options = {
      exportTimeoutMillis: options.exportTimeoutMillis ?? 30000,
      maxQueueSize: options.maxQueueSize ?? 100,
      spanFilter: options.spanFilter,
    };
  }

  /**
   * Called when a span starts.
   * Can be used for span enrichment before it ends.
   */
  onStart(_span: Span, _parentContext: Context): void {
    // No-op: We process spans on end
  }

  /**
   * Called when a span ends. Exports the span to the configured exporter.
   */
  onEnd(span: ReadableSpan): void {
    if (this.isShutdown) {
      return;
    }

    // Apply optional filter
    if (this.options.spanFilter && !this.options.spanFilter(span)) {
      return;
    }

    this.pendingSpans.push(span);

    // Check if we should flush based on queue size
    if (
      this.options.maxQueueSize &&
      this.pendingSpans.length >= this.options.maxQueueSize
    ) {
      void this.flushPendingSpans();
    } else {
      // Export immediately for simplicity
      void this.exportSpan(span);
    }
  }

  /**
   * Shuts down the processor and underlying exporter
   */
  async shutdown(): Promise<void> {
    if (this.isShutdown) {
      return;
    }

    this.isShutdown = true;

    // Flush any pending spans
    await this.flushPendingSpans();

    // Shutdown the exporter
    return this.exporter.shutdown();
  }

  /**
   * Forces a flush of any pending spans
   */
  async forceFlush(): Promise<void> {
    await this.flushPendingSpans();
  }

  /**
   * Export a single span
   */
  private async exportSpan(span: ReadableSpan): Promise<void> {
    return new Promise<void>((resolve) => {
      this.exporter.export([span], () => {
        resolve();
      });
    });
  }

  /**
   * Flush all pending spans to the exporter
   */
  private async flushPendingSpans(): Promise<void> {
    if (this.pendingSpans.length === 0) {
      return;
    }

    const spansToExport = [...this.pendingSpans];
    this.pendingSpans = [];

    return new Promise<void>((resolve) => {
      this.exporter.export(spansToExport, () => {
        resolve();
      });
    });
  }
}
