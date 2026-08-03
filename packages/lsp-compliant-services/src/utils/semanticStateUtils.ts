/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ISymbolManager, Position } from '@salesforce/apex-lsp-parser-ast';

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
    return context?.semanticState !== 'incomplete';
  } catch {
    return false;
  }
}
