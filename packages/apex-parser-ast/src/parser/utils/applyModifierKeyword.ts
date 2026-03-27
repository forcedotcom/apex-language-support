/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SymbolModifiers, SymbolVisibility } from '../../types/symbol';

/**
 * Maps a single Apex modifier keyword string onto {@link SymbolModifiers}.
 * Used by symbol collectors when walking modifier lists from the parse tree.
 */
export function applyModifierKeyword(
  modifiers: SymbolModifiers,
  modifier: string,
): void {
  switch (modifier.toLowerCase()) {
    case 'public':
      modifiers.visibility = SymbolVisibility.Public;
      break;
    case 'private':
      modifiers.visibility = SymbolVisibility.Private;
      break;
    case 'protected':
      modifiers.visibility = SymbolVisibility.Protected;
      break;
    case 'global':
      modifiers.visibility = SymbolVisibility.Global;
      break;
    case 'static':
      modifiers.isStatic = true;
      break;
    case 'final':
      modifiers.isFinal = true;
      break;
    case 'abstract':
      modifiers.isAbstract = true;
      break;
    case 'virtual':
      modifiers.isVirtual = true;
      break;
    case 'override':
      modifiers.isOverride = true;
      break;
    case 'transient':
      modifiers.isTransient = true;
      break;
    case 'testmethod':
      modifiers.isTestMethod = true;
      break;
    case 'webservice':
      modifiers.isWebService = true;
      break;
  }
}
