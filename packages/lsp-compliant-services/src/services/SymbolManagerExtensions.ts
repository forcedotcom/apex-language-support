/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Removed Effect import since we're using Promise-based APIs
import { getLogger } from '@salesforce/apex-lsp-shared';
import {
  ApexSymbolManager,
  ApexSymbolProcessingManager,
} from '@salesforce/apex-lsp-parser-ast';
import {
  createWaitForSymbolMethod,
  type ISymbolManagerExtended,
} from './IndexingObserver';

/**
 * Extended ApexSymbolManager with waiting capabilities
 */
export class ExtendedApexSymbolManager
  extends ApexSymbolManager
  implements ISymbolManagerExtended
{
  public readonly waitForSymbol: (symbolKey: string) => Promise<void>;

  constructor() {
    super();

    // Add the waitForSymbol method using the factory function
    this.waitForSymbol = createWaitForSymbolMethod(
      getLogger(),
      100, // pollIntervalMs
      30000, // maxWaitMs
    ).bind(this);
  }
}

/**
 * Monkey patch the existing ApexSymbolManager to add waitForSymbol capability
 * This is a temporary solution until we can modify the core symbol manager
 */
export function extendSymbolManagerWithWaiting(): void {
  const logger = getLogger();

  // Get the singleton instance
  const processingManager = ApexSymbolProcessingManager.getInstance();
  const symbolManager = processingManager.getSymbolManager();

  // Add waitForSymbol method if it doesn't exist
  if (!('waitForSymbol' in symbolManager)) {
    logger.debug(
      () => 'Adding waitForSymbol method to existing ApexSymbolManager',
    );

    const waitForSymbolMethod = createWaitForSymbolMethod(logger);
    (symbolManager as any).waitForSymbol =
      waitForSymbolMethod.bind(symbolManager);

    logger.debug(
      () => 'ApexSymbolManager extended with waitForSymbol capability',
    );
  }
}

/**
 * Get an extended symbol manager instance with waiting capabilities
 */
export function getExtendedSymbolManager(): ApexSymbolManager &
  ISymbolManagerExtended {
  // First, ensure the existing manager is extended
  extendSymbolManagerWithWaiting();

  // Return the extended manager
  const processingManager = ApexSymbolProcessingManager.getInstance();
  return processingManager.getSymbolManager() as ApexSymbolManager &
    ISymbolManagerExtended;
}
