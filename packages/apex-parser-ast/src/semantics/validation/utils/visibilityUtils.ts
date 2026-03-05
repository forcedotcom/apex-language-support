/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type {
  TypeSymbol,
  ApexSymbol,
  ScopeSymbol,
} from '../../../types/symbol';
import { SymbolKind } from '../../../types/symbol';
import { isBlockSymbol } from '../../../utils/symbolNarrowing';
import { AnnotationUtils } from '../../../utils/AnnotationUtils';
import type { ISymbolManager as ISymbolManagerInterface } from '../../../types/ISymbolManager';

/**
 * Get the enclosing (outer) class for an inner class, or null if top-level.
 */
export function getEnclosingClass(
  typeSymbol: TypeSymbol,
  allSymbols: ApexSymbol[],
  symbolManager: ISymbolManagerInterface,
): TypeSymbol | null {
  if (!typeSymbol.parentId) return null;

  const resolve = (id: string): ApexSymbol | null =>
    allSymbols.find((s) => s.id === id) ?? symbolManager.getSymbol(id) ?? null;

  const parent = resolve(typeSymbol.parentId);
  if (!parent) return null;

  if (
    parent.kind === SymbolKind.Class ||
    parent.kind === SymbolKind.Interface
  ) {
    return parent as TypeSymbol;
  }

  if (
    isBlockSymbol(parent) &&
    (parent as ScopeSymbol).scopeType === 'class' &&
    parent.parentId
  ) {
    const grandParent = resolve(parent.parentId);
    if (
      grandParent &&
      (grandParent.kind === SymbolKind.Class ||
        grandParent.kind === SymbolKind.Interface)
    ) {
      return grandParent as TypeSymbol;
    }
  }

  return null;
}

/**
 * Check if the calling class is in a test context (has @isTest or is an inner class of an @isTest class).
 */
export function isInTestContext(
  callingClass: TypeSymbol,
  allSymbols: ApexSymbol[],
  symbolManager: ISymbolManagerInterface,
): boolean {
  let current: TypeSymbol | null = callingClass;
  while (current) {
    if (AnnotationUtils.isTestClass(current)) {
      return true;
    }
    current = getEnclosingClass(current, allSymbols, symbolManager);
  }
  return false;
}
