/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { TextDocumentChangeEvent } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { LoggerInterface } from '@salesforce/apex-lsp-shared';

/**
 * Configuration for per-URI debounce behaviour.
 */
export interface DocumentChangeBatchConfig {
  /** Debounce window in milliseconds (default 150) */
  debounceMs: number;
}

export const DEFAULT_CHANGE_BATCH_CONFIG: DocumentChangeBatchConfig = {
  debounceMs: 150,
};

/**
 * Callback invoked when the debounce timer fires for a URI.
 * Receives the latest event that was queued for that URI.
 */
export type ChangeProcessor = (
  event: TextDocumentChangeEvent<TextDocument>,
) => Promise<void>;

/**
 * Per-URI debounced batcher for didChange events.
 *
 * Each URI maintains its own timer. When a new change arrives for a URI the
 * timer is reset and only the latest event is kept. When the timer fires the
 * latest event is forwarded to the provided processor callback.
 *
 * This prevents excessive parsing during rapid typing while ensuring the
 * latest document content is always processed.
 */
export class DocumentChangeBatcher {
  private readonly config: DocumentChangeBatchConfig;
  private readonly logger: LoggerInterface;
  private readonly processor: ChangeProcessor;

  /** Latest pending event per URI */
  private readonly pending = new Map<
    string,
    TextDocumentChangeEvent<TextDocument>
  >();

  /** Active timer handles per URI */
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    logger: LoggerInterface,
    processor: ChangeProcessor,
    config: Partial<DocumentChangeBatchConfig> = {},
  ) {
    this.logger = logger;
    this.processor = processor;
    this.config = { ...DEFAULT_CHANGE_BATCH_CONFIG, ...config };
  }

  /**
   * Queue a didChange event. Resets the debounce timer for its URI and
   * keeps only the latest event (newest version).
   */
  enqueue(event: TextDocumentChangeEvent<TextDocument>): void {
    const uri = event.document.uri;

    // Only keep the latest version for a URI
    const existing = this.pending.get(uri);
    if (existing && existing.document.version >= event.document.version) {
      // Stale event – ignore
      return;
    }

    this.pending.set(uri, event);

    // Reset timer for this URI
    const existingTimer = this.timers.get(uri);
    if (existingTimer !== undefined) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.flush(uri);
    }, this.config.debounceMs);

    this.timers.set(uri, timer);
  }

  /**
   * Flush a single URI immediately (called by timer or externally).
   */
  private flush(uri: string): void {
    this.timers.delete(uri);
    const event = this.pending.get(uri);
    this.pending.delete(uri);

    if (!event) {
      return;
    }

    this.logger.debug(
      () =>
        `[DocumentChangeBatcher] Flushing change for ${uri} (version: ${event.document.version})`,
    );

    this.processor(event).catch((error) => {
      this.logger.error(
        () =>
          `[DocumentChangeBatcher] Error processing change for ${uri}: ${error}`,
      );
    });
  }

  /**
   * Flush all pending URIs immediately (useful for shutdown / testing).
   */
  flushAll(): void {
    for (const [uri, timer] of this.timers.entries()) {
      clearTimeout(timer);
      this.timers.delete(uri);
      this.flush(uri);
    }
  }

  /**
   * Cancel all pending timers and discard events (for shutdown).
   */
  dispose(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.pending.clear();
  }
}
