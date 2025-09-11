/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LoggerInterface } from '@salesforce/apex-lsp-shared';
import { ApexSymbolProcessingManager } from '@salesforce/apex-lsp-parser-ast';

/**
 * Interface for observing indexing completion
 */
export interface IndexingObserver {
  readonly waitForAnyIndexed: (uris: ReadonlyArray<string>) => Promise<void>;
  readonly waitForFileIndexed: (uri: string) => Promise<void>;
}

/**
 * Implementation of IndexingObserver that polls the symbol manager
 */
export class IndexingObserverImpl implements IndexingObserver {
  constructor(
    private readonly logger: LoggerInterface,
    private readonly pollIntervalMs: number = 100,
    private readonly maxWaitMs: number = 30000,
  ) {}

  /**
   * Wait for any of the provided URIs to be indexed
   */
  async waitForAnyIndexed(uris: ReadonlyArray<string>): Promise<void> {
    if (!uris.length) {
      return;
    }

    this.logger.debug(
      () => `Waiting for any of ${uris.length} URIs to be indexed`,
    );

    const startTime = Date.now();
    const deadline = startTime + this.maxWaitMs;

    while (Date.now() < deadline) {
      // Check if any URI is indexed
      const symbolManager = ApexSymbolProcessingManager.getInstance();
      const manager = symbolManager.getSymbolManager();

      for (const uri of uris) {
        const filePath = normalizeUri(uri);
        const symbols = manager.findSymbolsInFile(filePath);

        if (symbols.length > 0) {
          this.logger.debug(() => `File ${filePath} has been indexed`);
          return;
        }
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
    }

    // Timeout reached
    throw new Error(`Timeout waiting for indexing of URIs: ${uris.join(', ')}`);
  }

  /**
   * Wait for a specific file to be indexed
   */
  async waitForFileIndexed(uri: string): Promise<void> {
    return this.waitForAnyIndexed([uri]);
  }
}

/**
 * Normalize URI to file path for symbol manager lookup
 */
function normalizeUri(uri: string): string {
  if (uri.startsWith('file://')) {
    return decodeURIComponent(uri.substring(7));
  }
  return uri;
}

/**
 * Extension interface for ISymbolManager to add waiting capabilities
 */
export interface ISymbolManagerExtended {
  /**
   * Wait for a symbol with the given key to appear in the symbol manager
   */
  readonly waitForSymbol?: (symbolKey: string) => Promise<void>;
}

/**
 * Implementation of waitForSymbol method that can be mixed into symbol managers
 */
export function createWaitForSymbolMethod(
  logger: LoggerInterface,
  pollIntervalMs: number = 100,
  maxWaitMs: number = 30000,
) {
  return async function waitForSymbol(
    this: any, // 'this' will be the symbol manager instance
    symbolKey: string,
  ): Promise<void> {
    logger.debug(() => `Waiting for symbol: ${symbolKey}`);

    // Parse the symbol key (format: "kind:identifier")
    const [kind, identifier] = symbolKey.split(':', 2);

    if (!identifier) {
      logger.warn(() => `Invalid symbol key format: ${symbolKey}`);
      return;
    }

    const startTime = Date.now();
    const deadline = startTime + maxWaitMs;

    while (Date.now() < deadline) {
      const symbols = this.findSymbolByName(identifier);

      if (symbols.length > 0) {
        // If kind is specified, filter by kind
        if (kind && kind !== 'unknown') {
          const filteredSymbols = symbols.filter((symbol: any) => {
            const symbolKind = symbol.kind?.toLowerCase();
            return (
              symbolKind === kind.toLowerCase() ||
              (kind === 'class' &&
                (symbolKind === 'class' || symbolKind === 'type')) ||
              (kind === 'trigger' && symbolKind === 'trigger')
            );
          });

          if (filteredSymbols.length > 0) {
            logger.debug(() => `Symbol found: ${symbolKey}`);
            return;
          }
        } else {
          logger.debug(() => `Symbol found: ${symbolKey}`);
          return;
        }
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    // Timeout reached
    throw new Error(`Timeout waiting for symbol: ${symbolKey}`);
  };
}

/**
 * Factory function to create an IndexingObserver
 */
export function createIndexingObserver(
  logger: LoggerInterface,
  pollIntervalMs: number = 100,
  maxWaitMs: number = 30000,
): IndexingObserver {
  return new IndexingObserverImpl(logger, pollIntervalMs, maxWaitMs);
}
