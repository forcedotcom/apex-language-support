/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  ApexSymbol,
  ISymbolManager,
  FQNOptions,
} from '@salesforce/apex-lsp-parser-ast';

/**
 * Block symbol name patterns that should be excluded from display FQNs
 * These patterns match block symbols like "class_1", "method_2", "block_3", "if_4", etc.
 * Format: {scopeType}_{counter} where scopeType is one of the block types
 */
const BLOCK_SYMBOL_PATTERN = /^(class|method|block|if|while|for|try|catch|finally|switch|when|dowhile|runas|getter|setter)_\d+$/i;

/**
 * Transforms a full FQN (including block symbols) to a display FQN (semantic hierarchy only)
 * Removes block symbol segments like "class_1", "method_2", "block_3" from the FQN
 *
 * @param fqn The full FQN string that may include block symbols
 * @returns The display FQN with block symbols removed
 *
 * @example
 * ```typescript
 * toDisplayFQN("testclass.class_1.somemethod.method_2.block_3.ifvar")
 * // Returns: "testclass.somemethod.ifvar"
 * ```
 */
export function toDisplayFQN(fqn: string): string {
  if (!fqn) {
    return fqn;
  }

  // Split FQN by dots and filter out block symbol patterns
  const parts = fqn.split('.');
  const displayParts = parts.filter((part) => {
    // Remove block symbol patterns (e.g., "class_1", "method_2", "block_3")
    return !BLOCK_SYMBOL_PATTERN.test(part);
  });

  return displayParts.join('.');
}

/**
 * Calculates a display FQN for a symbol (semantic hierarchy without block symbols)
 * This is the user-facing FQN format that excludes structural block symbols
 *
 * @param symbol The symbol to calculate the display FQN for
 * @param symbolManager The symbol manager to use for FQN calculation
 * @param options Optional FQN generation options
 * @returns The display FQN (semantic hierarchy only, no block symbols)
 *
 * @example
 * ```typescript
 * // For a method symbol, returns "TestClass.getStaticValue()"
 * // instead of "TestClass.class_1.getStaticValue()"
 * const displayFQN = calculateDisplayFQN(methodSymbol, symbolManager, {
 *   normalizeCase: false
 * });
 * ```
 */
export function calculateDisplayFQN(
  symbol: ApexSymbol,
  symbolManager: ISymbolManager,
  options?: FQNOptions,
): string {
  // Get the full FQN from the symbol manager (includes block symbols)
  const fullFQN = symbolManager.constructFQN(symbol, options);

  // Transform to display FQN by removing block symbols
  return toDisplayFQN(fullFQN);
}

