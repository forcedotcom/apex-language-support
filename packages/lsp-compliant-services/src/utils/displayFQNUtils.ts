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
 * - Legacy format: {scopeType}_{counter} e.g. "class_1", "method_2", "block_3"
 * - StructureListener format: block_{line}_{column} e.g. "block_15_36"
 */
const BLOCK_SYMBOL_PATTERN =
  /^(class|method|block|if|while|for|try|catch|finally|switch|when|dowhile|runas|getter|setter)_\d+$/i;
const STRUCTURE_BLOCK_PATTERN = /^block_\d+_\d+$/i;

/**
 * Transforms a full FQN (including block symbols) to a display FQN (semantic hierarchy only)
 * Removes block symbol segments and deduplicates when block names match semantic symbols
 * (e.g. StructureListener uses class/method names for blocks, causing "FileUtilities.FileUtilities")
 *
 * @param fqn The full FQN string that may include block symbols
 * @returns The display FQN with block symbols removed
 *
 * @example
 * ```typescript
 * toDisplayFQN("testclass.class_1.somemethod.method_2.block_3.ifvar")
 * // Returns: "testclass.somemethod.ifvar"
 * toDisplayFQN("FileUtilities.FileUtilities.createFile.createFile.base64data")
 * // Returns: "FileUtilities.createFile.base64data"
 * ```
 */
export function toDisplayFQN(fqn: string): string {
  if (!fqn) {
    return fqn;
  }

  const parts = fqn.split('.');
  const filtered: string[] = [];
  for (const part of parts) {
    // Remove block symbol patterns (legacy and StructureListener format)
    if (BLOCK_SYMBOL_PATTERN.test(part) || STRUCTURE_BLOCK_PATTERN.test(part)) {
      continue;
    }
    // Deduplicate: block names often match semantic symbols (class block name = class name)
    if (filtered.length > 0 && filtered[filtered.length - 1] === part) {
      continue;
    }
    filtered.push(part);
  }

  return filtered.join('.');
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
