/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ISymbolManager, Position } from '@salesforce/apex-lsp-parser-ast';
import { getLogger } from '@salesforce/apex-lsp-shared';

const logger = getLogger();

/**
 * Report whether the current parser-owned snapshot can place the request
 * position in a semantic scope.
 *
 * Document text is intentionally not interpreted here. Resolution context is
 * derived by the symbol manager from its current SymbolTable. Managers which
 * predate `semanticState` remain compatible: only an explicit `incomplete`
 * state (or a failed context query) blocks semantic language features.
 */
export async function hasCompleteSemanticState(
  symbolManager: ISymbolManager,
  fileUri: string,
  position: Position,
): Promise<boolean> {
  const createContext = symbolManager.createResolutionContext;
  if (typeof createContext !== 'function') {
    // Compatibility for narrow test doubles and third-party implementations.
    return true;
  }

  try {
    const context = await createContext.call(
      symbolManager,
      '',
      position,
      fileUri,
    );
    if (context?.semanticState !== 'incomplete') return true;

    // Top-level declarations legitimately have no lexical scope. Preserve an
    // explicit parser-owned reference or declaration at the cursor instead of
    // treating the lack of a containing scope as stale semantic state.
    const parserPosition = {
      line: position.line + 1,
      character: position.character,
    };
    const references = await symbolManager.getReferencesAtPosition(
      fileUri,
      parserPosition,
    );
    if (references.length > 0) return true;
    const symbol = await symbolManager.getSymbolAtPosition(
      fileUri,
      parserPosition,
      'precise',
    );
    return symbol != null;
  } catch (error) {
    logger.debug(
      () => `Unable to inspect semantic state for ${fileUri}: ${String(error)}`,
    );
    return false;
  }
}
