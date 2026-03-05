/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Shared type name extraction utilities for validation.
 * Used by MethodResolutionValidator, VariableResolutionValidator,
 * TypeResolutionValidator, InstanceofValidator, MethodCallValidator.
 */

/**
 * Strip generic type params for resolution.
 * "List<GeocodingService.Coordinates>" -> "List"
 * Used when resolving receiver type for method calls (e.g. list.size()).
 */
export function extractBaseTypeForResolution(typeName: string): string {
  return typeName.split('<')[0].trim();
}

/**
 * Extract base type name: strip generics and take last part after dot, lowercase.
 * "List<String>" -> "list", "GeocodingService.Coordinates" -> "coordinates"
 * Used for type name comparison and builtin checks.
 */
export function extractBaseTypeName(typeName: string): string {
  const withoutGenerics = typeName.split('<')[0].trim();
  const parts = withoutGenerics.split('.');
  return (parts[parts.length - 1] ?? '').toLowerCase();
}

/**
 * Extract element type from List<E> or Set<E>.
 * "List<GeocodingService.Coordinates>" -> "GeocodingService.Coordinates"
 * Returns null if not a collection type.
 */
export function extractElementTypeFromCollection(
  typeName: string,
): string | null {
  const lower = typeName.toLowerCase();
  const listMatch = lower.match(/^list<([^>]+)>$/);
  if (listMatch) return listMatch[1].trim();
  const setMatch = lower.match(/^set<([^>]+)>$/);
  if (setMatch) return setMatch[1].trim();
  return null;
}

/** Minimal field ref shape for extractReceiverExpressionBeforeDot */
export interface FieldRefForReceiver {
  name?: string;
  location?: {
    identifierRange?: { startLine?: number; startColumn?: number };
    symbolRange?: { startLine?: number; startColumn?: number };
  };
}

/**
 * Extract the receiver expression before the dot (e.g. "arr[0]" for "arr[0].field").
 * Used to detect array access for List[0].field -> element type resolution.
 */
export function extractReceiverExpressionBeforeDot(
  fieldRef: FieldRefForReceiver,
  sourceContent: string | undefined,
): string | null {
  if (!sourceContent || !fieldRef?.location) return null;
  const startLine =
    fieldRef.location.identifierRange?.startLine ??
    fieldRef.location.symbolRange?.startLine;
  const startColumn =
    fieldRef.location.identifierRange?.startColumn ??
    fieldRef.location.symbolRange?.startColumn;
  const lines = sourceContent.split('\n');
  if (
    startLine == null ||
    startColumn == null ||
    startLine < 1 ||
    startLine > lines.length
  )
    return null;
  const line = lines[startLine - 1];
  if (!line) return null;
  const fieldName = fieldRef.name;
  const fieldIdx = line
    .substring(startColumn - 1)
    .toLowerCase()
    .indexOf(fieldName?.toLowerCase() ?? '');
  if (fieldIdx < 0) return null;
  const dotIdx = startColumn - 1 + fieldIdx - 1;
  if (dotIdx < 0 || line[dotIdx] !== '.') return null;
  return line.substring(0, dotIdx).trim();
}
