/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ApexSymbol, TypeSymbol } from '../../../types/symbol';
import { SymbolKind } from '../../../types/symbol';
import {
  INSTANCEOF_PRIMITIVE_TYPES,
  isNumericType,
  isPrimitiveType,
  NON_NULLABLE_PRIMITIVES,
} from '../../../utils/primitiveTypes';

export { isPrimitiveType, isNumericType };

/** Numeric types that support widening promotion */
const NUMERIC_PROMOTIONS: Record<string, string[]> = {
  integer: ['long', 'double', 'decimal'],
  long: ['double', 'decimal'],
  double: ['decimal'],
};

export type AssignabilityContext =
  | 'method-parameter' // Object accepts all reference types (Assert.isNotNull(String))
  | 'instanceof-rhs' // Object rejects primitives as RHS type
  | 'assignment'; // Object accepts all; Id→String; primitive promotion

export interface AssignabilityOptions {
  allSymbols?: ApexSymbol[];
}

/**
 * Check if sourceType is assignable to targetType in the given context.
 * Single source of truth for type assignability across validators.
 */
export function isAssignable(
  sourceType: string,
  targetType: string,
  context: AssignabilityContext,
  options?: AssignabilityOptions,
): boolean {
  const base = (s: string) => s.split('.').pop() ?? s;
  let source = base((sourceType ?? '').toLowerCase());
  let target = base((targetType ?? '').toLowerCase());
  if (target === 'system.object') target = 'object';
  if (target === 'system.type') target = 'type';
  if (context === 'method-parameter' && !target) return true;

  // Exact match
  if (source === target) return true;

  // null is compatible with any object type, except non-nullable primitives
  if (source === 'null') {
    return context === 'assignment'
      ? !NON_NULLABLE_PRIMITIVES.has(target)
      : true;
  }

  // Unknown/fallback (empty source) - skip strict check
  if (!source) return true;

  // object as source: method/instanceof treat as permissive; assignment rejects narrowing (Object→String)
  if (source === 'object') {
    if (context === 'assignment') return target === 'object';
    return true; // method-parameter, instanceof-rhs: permissive
  }

  // Context-specific: target is Object
  if (target === 'object') {
    switch (context) {
      case 'method-parameter':
        return source !== 'void';
      case 'instanceof-rhs':
        return !INSTANCEOF_PRIMITIVE_TYPES.has(source);
      case 'assignment':
        return true;
    }
  }

  // method-parameter: Type param accepts Type and Object (e.g. Assert.isInstanceOfType)
  if (context === 'method-parameter' && target === 'type') {
    return ['type', 'object'].includes(source);
  }

  // Assignment-only: Id → String
  if (context === 'assignment' && target === 'string' && source === 'id') {
    return true;
  }

  // Assignment-only: primitive promotion (Integer→Long, etc.)
  if (context === 'assignment') {
    const promotions = NUMERIC_PROMOTIONS[source];
    if (promotions?.includes(target)) return true;
  }

  // Subtype check (superClass, interfaces)
  const allSymbols = options?.allSymbols ?? [];
  const sourceSymbol = allSymbols.find(
    (s) =>
      (s.kind === SymbolKind.Class ||
        s.kind === SymbolKind.Interface ||
        s.kind === SymbolKind.Enum) &&
      s.name.toLowerCase() === source,
  ) as TypeSymbol | undefined;

  const targetSymbol = allSymbols.find(
    (s) =>
      (s.kind === SymbolKind.Class ||
        s.kind === SymbolKind.Interface ||
        s.kind === SymbolKind.Enum) &&
      s.name.toLowerCase() === target,
  ) as TypeSymbol | undefined;

  if (sourceSymbol && targetSymbol) {
    if (sourceSymbol.superClass?.toLowerCase() === target) return true;
    if (sourceSymbol.interfaces?.some((i) => i.toLowerCase() === target))
      return true;
  }

  return false;
}
